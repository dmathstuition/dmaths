import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

// POST { submissionId, grade, feedback } — grade + email the student
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

  await admin.from("assignment_submissions")
    .update({ grade: g, feedback: cleanFeedback, status: "graded" })
    .eq("id", submissionId);

  if (g === 100) {
    const { data: perfectBadge } = await admin.from("badges").select("id, name, description").eq("slug", "perfect_score").single();
    if (perfectBadge) {
      const { error: badgeErr } = await admin.from("student_badges")
        .insert({ student_id: sub.student_id, badge_id: (perfectBadge as any).id });
      if (!badgeErr) {
        await admin.from("notifications").insert({
          user_id: sub.student_id,
          title: `Badge unlocked: ${(perfectBadge as any).name}!`,
          body: (perfectBadge as any).description,
          link: "/portal/badges",
        });
      }
    }
  }

  await admin.from("audit_log").insert({ actor_id: user.id, action: "grade_assignment", detail: { submissionId, grade } });
  await admin.from("notifications").insert({
    user_id: sub.student_id,
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
