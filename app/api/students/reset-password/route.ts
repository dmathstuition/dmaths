import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

// POST { studentId } — admin resets a learner's password to a fresh temporary
// one. The new password is RETURNED to the admin so it can be shared directly,
// which is what makes this work even when email is down. Emailing is
// best-effort on top.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await req.json().catch(() => ({ studentId: null }));
  if (!studentId || typeof studentId !== "string") {
    return NextResponse.json({ error: "studentId required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: student } = await admin.from("profiles")
    .select("first_name, last_name, email, student_code, role").eq("id", studentId).single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (student.role === "admin") return NextResponse.json({ error: "Refusing to reset an admin here" }, { status: 400 });

  // Fresh temp password — same shape as the one issued at approval.
  const tempPassword =
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!";

  const { error: updErr } = await admin.auth.admin.updateUserById(studentId, {
    password: tempPassword, email_confirm: true,
  });
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "student_password_reset", detail: { studentId, email: student.email },
  });

  // Best-effort email using the existing "credentials" template; the admin also
  // gets the password back on screen so a mail outage never blocks recovery.
  const emailed = await sendEmail("credentials", student.email, {
    firstName: student.first_name,
    studentCode: student.student_code,
    email: student.email,
    tempPassword,
    loginUrl: loginUrl(),
  }).catch(() => false);

  return NextResponse.json({
    ok: true,
    email: student.email,
    tempPassword,
    loginUrl: loginUrl(),
    emailed,
  });
}
