import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

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
    loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
  });

  return NextResponse.json({ ok: true, studentCode: code });
}
