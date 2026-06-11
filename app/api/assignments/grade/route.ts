import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// POST { submissionId, grade, feedback } — grade + email the student
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { submissionId, grade, feedback = "" } = await req.json();
  const admin = supabaseAdmin();

  const { data: sub } = await admin.from("assignment_submissions")
    .select("*, assignment:assignments(title,subject), student:profiles(first_name,email)")
    .eq("id", submissionId).single();
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });

  await admin.from("assignment_submissions")
    .update({ grade: Number(grade), feedback, status: "graded" })
    .eq("id", submissionId);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "grade_assignment", detail: { submissionId, grade } });

  await sendEmail("graded", sub.student.email, {
    firstName: sub.student.first_name,
    title: sub.assignment.title,
    subject: sub.assignment.subject,
    grade,
    feedback,
    loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
  });

  return NextResponse.json({ ok: true });
}
