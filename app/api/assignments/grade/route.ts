import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { notifyUser } from "@/lib/notify";
import { requireStaff, staffCanAccessStudent } from "@/lib/authRole";

// POST { submissionId, grade, feedback } — grade + email the student
export async function POST(req: Request) {
  // Admins grade anyone; tutors only their roster.
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { submissionId, grade, feedback = "" } = await req.json();
  const g = Number(grade);
  if (!submissionId || !Number.isFinite(g) || g < 0 || g > 100) {
    return NextResponse.json({ error: "grade must be 0-100" }, { status: 400 });
  }
  const cleanFeedback = String(feedback).slice(0, 2000);
  const admin = supabaseAdmin();

  const { data: sub } = await admin.from("assignment_submissions")
    .select("*, assignment:assignments(title,subject), student:profiles(first_name,email)")
    .eq("id", submissionId).single();
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await staffCanAccessStudent(staff, sub.student_id))) {
    return NextResponse.json({ error: "That learner isn't in your roster." }, { status: 403 });
  }

  await admin.from("assignment_submissions")
    .update({ grade: g, feedback: cleanFeedback, status: "graded" })
    .eq("id", submissionId);

  if (g === 100) {
    const { data: perfectBadge } = await admin.from("badges").select("id, name, description").eq("slug", "perfect_score").single();
    if (perfectBadge) {
      const { error: badgeErr } = await admin.from("student_badges")
        .insert({ student_id: sub.student_id, badge_id: (perfectBadge as any).id });
      if (!badgeErr) {
        await notifyUser(admin, sub.student_id, {
          title: `Badge unlocked: ${(perfectBadge as any).name}!`,
          body: (perfectBadge as any).description,
          link: "/portal/badges",
        });
      }
    }
  }

  await admin.from("audit_log").insert({ actor_id: staff.id, action: "grade_assignment", detail: { submissionId, grade } });
  await notifyUser(admin, sub.student_id, {
    title: "Assignment graded",
    body: `${g}/100 — ${sub.assignment.title}`,
    link: "/portal/assignments",
  });

  await sendEmail("graded", sub.student.email, {
    firstName: sub.student.first_name,
    title: sub.assignment.title,
    subject: sub.assignment.subject,
    grade,
    feedback: cleanFeedback,
    loginUrl: loginUrl(),
  });

  return NextResponse.json({ ok: true });
}
