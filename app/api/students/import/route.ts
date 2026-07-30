import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { parseStudentsCsv } from "@/lib/csvStudents";

// Bulk-create learner accounts from a pasted CSV. Admin-only. Each row becomes
// an auth user + a student profile with a generated code, and its login details
// are emailed — the same steps the enrolment-approval flow already does, in a
// loop. A row whose email already has an account is skipped, not duplicated.
export const dynamic = "force-dynamic";

function tempPassword() {
  return (
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!"
  );
}

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const csv = String(body?.csv ?? "");
  const { rows, errors } = parseStudentsCsv(csv);

  if (!rows.length) {
    return NextResponse.json({ error: errors[0]?.reason || "No valid rows to import.", errors }, { status: 400 });
  }
  // Guard against a runaway paste.
  if (rows.length > 300) {
    return NextResponse.json({ error: "That's more than 300 learners at once — split it into smaller files." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const created: { email: string; studentCode: string }[] = [];
  const skipped: { email: string; reason: string }[] = [];

  for (const r of rows) {
    // Already have an account with this email? Skip — never duplicate.
    const { data: existing } = await admin.from("profiles").select("id").ilike("email", r.email).maybeSingle();
    if (existing) { skipped.push({ email: r.email, reason: "already has an account" }); continue; }

    const password = tempPassword();
    const { data: auth, error: authErr } = await admin.auth.admin.createUser({
      email: r.email, password, email_confirm: true,
    });
    if (authErr || !auth?.user) { skipped.push({ email: r.email, reason: authErr?.message || "could not create login" }); continue; }

    const { data: code } = await admin.rpc("next_student_code");
    const { error: profErr } = await admin.from("profiles").insert({
      id: auth.user.id, role: "student", student_code: code,
      first_name: r.first_name, last_name: r.last_name, email: r.email,
      level: r.level || null, phone: r.phone || "",
      guardian_name: r.guardian_name || "", guardian_email: r.guardian_email || "",
    });
    if (profErr) {
      await admin.auth.admin.deleteUser(auth.user.id); // roll back the orphan login
      skipped.push({ email: r.email, reason: profErr.message });
      continue;
    }

    created.push({ email: r.email, studentCode: String(code ?? "") });

    // Best-effort credentials email — a mail hiccup shouldn't fail the import.
    await sendEmail("credentials", r.email, {
      firstName: r.first_name,
      studentCode: code,
      email: r.email,
      tempPassword: password,
      loginUrl: loginUrl(),
    });
  }

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "students_imported",
    detail: { created: created.length, skipped: skipped.length },
  });

  return NextResponse.json({
    ok: true,
    created: created.length,
    skipped,
    rowErrors: errors,
  });
}
