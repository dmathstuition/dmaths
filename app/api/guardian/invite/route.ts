import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: student } = await admin.from("profiles")
    .select("first_name, last_name, guardian_email")
    .eq("id", studentId).single();

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.guardian_email) {
    return NextResponse.json({ error: "No guardian email set for this student. Save one first." }, { status: 400 });
  }

  // Revoke any existing token for this student
  await admin.from("guardian_tokens").delete().eq("student_id", studentId);

  const { data: row } = await admin.from("guardian_tokens").insert({
    student_id: studentId,
    guardian_email: student.guardian_email,
  }).select("token").single();

  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/guardian/${row!.token}`;
  const studentName = `${student.first_name} ${student.last_name}`;

  await sendEmail("guardian_invite", student.guardian_email, { studentName, portalUrl });
  await admin.from("audit_log").insert({ actor_id: user.id, action: "send_guardian_invite", detail: { studentId, guardianEmail: student.guardian_email } });

  return NextResponse.json({ ok: true, url: portalUrl });
}
