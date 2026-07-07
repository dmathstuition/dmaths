import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

export async function POST() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = supabaseAdmin();

  const { data: students } = await supa
    .from("profiles")
    .select("id, first_name, last_name, student_code, level, avg_score, attendance, stars, guardian_email")
    .eq("role", "student")
    .eq("is_active", true)
    .neq("guardian_email", "")
    .not("guardian_email", "is", null);

  if (!students?.length) {
    return NextResponse.json({ sent: 0, message: "No students have a guardian email set." });
  }

  // Fetch pending submissions for upcoming due dates (next 7 days)
  const in7days = new Date();
  in7days.setDate(in7days.getDate() + 7);
  const { data: pending } = await supa
    .from("assignment_submissions")
    .select("student_id, assignment:assignments(title, subject, due_date)")
    .eq("status", "pending")
    .lte("assignment.due_date", in7days.toISOString().slice(0, 10))
    .not("assignment.due_date", "is", null);

  const pendingByStudent: Record<string, any[]> = {};
  (pending ?? []).forEach((s: any) => {
    if (!s.assignment) return;
    (pendingByStudent[s.student_id] ??= []).push(s.assignment);
  });

  let sent = 0;
  for (const student of students) {
    if (!student.guardian_email) continue;
    const upcoming = (pendingByStudent[student.id] ?? []).slice(0, 5);
    const ok = await sendEmail("guardian_digest", student.guardian_email, {
      studentName: `${student.first_name} ${student.last_name}`,
      studentCode: student.student_code,
      level: student.level,
      avgScore: student.avg_score,
      attendance: student.attendance,
      stars: student.stars,
      upcomingAssignments: upcoming.map((a: any) => ({
        title: a.title,
        subject: a.subject,
        dueDate: new Date(a.due_date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" }),
      })),
      loginUrl: loginUrl(),
    });
    if (ok) sent++;
  }

  return NextResponse.json({ sent, total: students.length });
}
