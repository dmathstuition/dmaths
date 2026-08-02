import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse } from "@/lib/ai";

// Learner-facing study coach: turns their own progress numbers into a short,
// encouraging "focus this week" plan. Reads the learner's own profile + graded
// submissions server-side (RLS), so a learner can only ever coach themselves.
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

  // Per-subject averages from this learner's graded submissions (RLS-scoped).
  const { data: subs } = await supa
    .from("submissions")
    .select("grade, status, assignment:assignments(subject)")
    .eq("status", "graded");
  const byS: Record<string, { sum: number; n: number }> = {};
  for (const s of subs ?? []) {
    const subj = (s as any).assignment?.subject || "General";
    if ((s as any).grade == null) continue;
    (byS[subj] ??= { sum: 0, n: 0 });
    byS[subj].sum += Number((s as any).grade); byS[subj].n++;
  }
  const perSubject = Object.entries(byS).map(([subject, d]) => ({ subject, avg: Math.round(d.sum / d.n) }));

  const system = `You are an encouraging study coach for a Nigerian school learner. Given their numbers, write a SHORT plan for the week — at most 3 sentences. Name 1–2 subjects to prioritise (their lower ones) and ONE concrete action (e.g. "do 2 practice rounds in …"). Warm, plain, motivating. One emoji at most. Address them by first name if given.`;

  const userMsg = `First name: ${me.first_name || "there"}
Overall average: ${me.avg_score}%   Attendance: ${me.attendance ?? "—"}%   Streak: ${me.streak_count ?? 0} days
Per-subject averages: ${perSubject.length ? perSubject.map((p) => `${p.subject} ${p.avg}%`).join(", ") : "not enough graded work yet"}
Their subjects: ${(me.subjects ?? []).join(", ") || "—"}`;

  try {
    const plan = await aiChat({ system, user: userMsg, maxTokens: 300 });
    return NextResponse.json({ plan, generatedAt: new Date().toISOString() });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
