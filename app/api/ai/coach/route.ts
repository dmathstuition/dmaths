import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse } from "@/lib/ai";
import { weakestTopics } from "@/lib/adaptivePractice";

// Learner-facing study coach: turns their own progress into a short weekly focus
// plan PLUS one concrete goal for today. Performance-aware — it factors in their
// weakest topics, per-subject grades, streak and what's coming up. Reads are
// scoped to the signed-in learner, so a learner can only ever coach themselves.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-coach:${user.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "You just got a plan — try again in a minute." }, { status: 429 });
  }

  const { data: me } = await supa.from("profiles")
    .select("first_name, avg_score, attendance, subjects, streak_count").eq("id", user.id).single();
  if (me?.avg_score == null) {
    return NextResponse.json({ error: "Once you've got some graded work, your coach can build a plan. 📈" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const [{ data: subs }, { data: mastery }, { data: mocks }] = await Promise.all([
    admin.from("assignment_submissions").select("grade, status, assignment:assignments(subject, title, due_date)").eq("student_id", user.id).limit(400),
    admin.from("topic_mastery").select("subject, topic, correct, total").eq("student_id", user.id),
    admin.from("mock_requests").select("subject").eq("student_id", user.id).eq("status", "approved").limit(3),
  ]);

  // Per-subject averages from graded work.
  const byS: Record<string, { sum: number; n: number }> = {};
  for (const s of subs ?? []) {
    if ((s as any).status !== "graded" || (s as any).grade == null) continue;
    const subj = (s as any).assignment?.subject || "General";
    (byS[subj] ??= { sum: 0, n: 0 });
    byS[subj].sum += Number((s as any).grade); byS[subj].n++;
  }
  const perSubject = Object.entries(byS).map(([subject, d]) => ({ subject, avg: Math.round(d.sum / d.n) }))
    .sort((a, b) => a.avg - b.avg);

  // Weakest topics, upcoming assignments and any approved mock waiting to be sat.
  const weak = weakestTopics(mastery ?? []);
  const upcoming = (subs ?? [])
    .filter((s: any) => s.status === "pending" && s.assignment?.due_date)
    .map((s: any) => ({ title: s.assignment.title, subject: s.assignment.subject, due: s.assignment.due_date }))
    .sort((a: any, b: any) => String(a.due).localeCompare(String(b.due)))
    .slice(0, 3);
  const pendingMocks = Array.from(new Set((mocks ?? []).map((m: any) => m.subject).filter(Boolean)));

  const system = `You are an encouraging study coach for a Nigerian school learner. Using their numbers, reply in TWO short parts, plain and motivating (one emoji at most), addressing them by first name:

This week: at most 2 sentences — name 1–2 things to prioritise (their weakest subjects/topics) and why.
Today: exactly one concrete action they can do now (e.g. "do a 10-question practice round on Quadratic equations", or sit a waiting mock). Prefer their weakest topic.

Format your reply as:
<one or two sentences for the week>
Today: <one action>`;

  const userMsg = `First name: ${me.first_name || "there"}
Overall average: ${me.avg_score}%   Attendance: ${me.attendance ?? "—"}%   Streak: ${me.streak_count ?? 0} days
Weakest subjects (grade): ${perSubject.slice(0, 3).map((p) => `${p.subject} ${p.avg}%`).join(", ") || "not enough graded work yet"}
Weakest topics (accuracy): ${weak.length ? weak.map((w) => `${w.topic} ${w.accuracy}%`).join(", ") : "none tracked yet"}
Assignments due soon: ${upcoming.length ? upcoming.map((u) => `${u.title} (${u.subject}) due ${u.due}`).join("; ") : "none"}
Mock exams approved and waiting: ${pendingMocks.length ? pendingMocks.join(", ") : "none"}
Their subjects: ${(me.subjects ?? []).join(", ") || "—"}`;

  try {
    const plan = await aiChat({ system, user: userMsg, maxTokens: 400 });
    return NextResponse.json({
      plan,
      focus: weak.slice(0, 3),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
