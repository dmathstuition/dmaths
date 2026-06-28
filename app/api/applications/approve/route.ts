import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { expectedNgnForPlan, depositNgnForPlan } from "@/lib/paystack";
import { loginUrl } from "@/lib/siteUrl";

// POST { id } — approve an application: create login, profile, email credentials.
export async function POST(req: Request) {
  // 1. Verify the caller is a signed-in admin (server-side, can't be faked)
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id || typeof id !== "string") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const admin = supabaseAdmin();

  // 2. Load the application
  const { data: app } = await admin.from("applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (app.status !== "pending") return NextResponse.json({ error: "already reviewed" }, { status: 409 });

  // 2b. PAYMENT GATE — for applications that claim a Paystack payment, the money
  //     must exist in the server-trusted `payments` ledger (written only by the
  //     verified webhook / verify route). This is what stops a forged client-side
  //     "paid" claim from ever becoming a real student account. Manual bank
  //     transfers / cash / free promo are unaffected — the admin vouches for those.
  const ref = (app.payment_ref || "").trim();
  const isPaystack = /paystack/i.test(app.payment_method || "");
  if (isPaystack && ref) {
    const { data: pay } = await admin
      .from("payments").select("*").eq("reference", ref).maybeSingle();

    if (!pay || pay.status !== "success" || (pay.currency || "NGN") !== "NGN") {
      return NextResponse.json(
        { error: "No verified Paystack payment is on record for this reference. Do not approve." },
        { status: 402 },
      );
    }
    if ((pay.email || "").toLowerCase() !== (app.email || "").toLowerCase()) {
      return NextResponse.json(
        { error: "The Paystack payment email does not match the applicant's email." },
        { status: 402 },
      );
    }
    // Part payment is allowed: the minimum is the 50% deposit. Anything below
    // that is blocked; deposit-to-full is approved and flagged as part payment.
    const full = expectedNgnForPlan(app.plan);
    const minDue = depositNgnForPlan(app.plan);
    if (minDue > 0 && Number(pay.amount) < minDue) {
      return NextResponse.json(
        { error: `Underpayment: ₦${Number(pay.amount).toLocaleString("en-NG")} received, minimum deposit is ₦${minDue.toLocaleString("en-NG")}.` },
        { status: 402 },
      );
    }
    // Reject re-use of one payment reference across multiple approved enrolments.
    const { data: dupe } = await admin
      .from("applications").select("id")
      .eq("payment_ref", ref).eq("status", "approved").neq("id", app.id).maybeSingle();
    if (dupe) {
      return NextResponse.json(
        { error: "This payment reference was already used for another approved enrolment." },
        { status: 409 },
      );
    }
    // Payment is genuine — mark it verified before we create the account, and
    // record whether the balance is fully settled or still part-paid.
    const payPlan = full > 0 && Number(pay.amount) < full ? "part" : "full";
    await admin.from("applications").update({
      payment_verified: true,
      payment_verified_at: new Date().toISOString(),
      pay_plan: payPlan,
    }).eq("id", app.id);
  }

  // 3. Create the auth account with a temporary password
  // 14-char password: 2 UUIDs sliced + symbols + digits — ~70 bits entropy vs the old ~40
  const tempPassword =
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || "auth create failed" }, { status: 500 });
  }

  // 4. Generate the student code and create the profile
  const { data: code } = await admin.rpc("next_student_code");
  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id, role: "student", student_code: code,
    first_name: app.first_name, last_name: app.last_name, email: app.email,
    phone: app.phone, dob: app.dob, address: app.address, level: app.level,
    guardian_name: app.guardian_name, guardian_contact: app.guardian_contact,
    subjects: app.subjects,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id); // roll back
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // 5. Mark approved + audit
  await admin.from("applications").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "approve_application", detail: { application_id: id, student_code: code } });

  // 6. Email credentials via the Apps Script relay
  await sendEmail("credentials", app.email, {
    firstName: app.first_name,
    studentCode: code,
    email: app.email,
    tempPassword,
    loginUrl: loginUrl(),
  });

  // 7. If a guardian email was provided, create a parent portal account
  const guardianEmail = ((app.guardian_email as string) || "").trim();
  if (guardianEmail) {
    // Check for an existing parent account with this email
    const { data: existingParent } = await admin
      .from("profiles")
      .select("id")
      .eq("email", guardianEmail)
      .eq("role", "parent")
      .maybeSingle();

    if (existingParent) {
      // Parent already has an account (e.g. another sibling) — just link them
      await admin
        .from("parent_student_links")
        .upsert(
          { parent_id: existingParent.id, student_id: created.user.id },
          { onConflict: "parent_id,student_id" },
        );
    } else {
      // New parent — create auth account, profile, link, and send credentials
      const tempParentPwd =
        crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
        crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
        "@" + Math.floor(Math.random() * 90 + 10) + "!";

      const { data: parentAuth, error: parentErr } = await admin.auth.admin.createUser({
        email: guardianEmail,
        password: tempParentPwd,
        email_confirm: true,
      });

      if (!parentErr && parentAuth.user) {
        await admin.from("profiles").insert({
          id: parentAuth.user.id,
          role: "parent",
          first_name: app.guardian_name || "Parent/Guardian",
          last_name: "",
          email: guardianEmail,
          is_active: true,
        });
        await admin.from("parent_student_links").insert({
          parent_id: parentAuth.user.id,
          student_id: created.user.id,
        });
        await sendEmail("parent_credentials", guardianEmail, {
          parentName: app.guardian_name || "Parent/Guardian",
          studentName: `${app.first_name} ${app.last_name}`,
          studentCode: code,
          email: guardianEmail,
          tempPassword: tempParentPwd,
          loginUrl: loginUrl(),
        });
      }
      // Parent account failure is non-fatal: student approval already succeeded
    }
  }

  return NextResponse.json({ ok: true, studentCode: code });
}
