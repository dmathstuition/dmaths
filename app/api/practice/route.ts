import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { watDay } from "@/lib/dailyReward";
import { pickRandom } from "@/lib/questionBank";
import { gradeAnswers, practicePoints, PRACTICE_DAILY_CAP, type Response } from "@/lib/practice";
import { aggregateTopics } from "@/lib/skillTree";
import { recordTopicMastery } from "@/lib/topicMastery";
import { happyHourMultiplier } from "@/lib/happyHour";

// Self-practice quiz. Questions come from the staff-only question_bank, served
// and graded here with the service role so the answer key never reaches the
// browser before an answer is submitted. Correct answers earn a few reward
// points, capped per day so practice can't be farmed for the leaderboard.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*(practice_sessions|question_bank)/i.test(m)
    ? "Practice needs migration-practice.sql (and migration-question-bank.sql) — run them in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, points: me?.reward_points ?? 0 };
}

// GET — with `count`: a fresh round (answers stripped). Otherwise: the filter
// options (subjects/levels in the bank) so the learner can choose what to sit.
export async function GET(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject")?.trim() ?? "";
  const level = url.searchParams.get("level")?.trim() ?? "";
  const count = Number(url.searchParams.get("count")) || 0;
  const admin = supabaseAdmin();

  // Meta: distinct subjects & levels present in the bank.
  if (!count) {
    const { data, error } = await admin.from("question_bank").select("subject, level").limit(3000);
    if (error) return NextResponse.json({ error: explain(error.message), subjects: [], levels: [], total: 0 }, { status: 200 });
    const rows = data ?? [];
    const subjects = Array.from(new Set(rows.map((r: any) => r.subject).filter(Boolean))).sort();
    const levels = Array.from(new Set(rows.map((r: any) => r.level).filter(Boolean))).sort();
    return NextResponse.json({ subjects, levels, total: rows.length });
  }

  // A round: pull the matching pool, pick N at random, strip the answers.
  let q = admin.from("question_bank").select("id, question, code, options, answer").limit(400);
  if (subject) q = q.eq("subject", subject);
  if (level) q = q.eq("level", level);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: explain(error.message), questions: [] }, { status: 200 });

  const wanted = Math.min(15, Math.max(1, count));
  const picked = pickRandom(data ?? [], wanted);
  const questions = picked.map((r: any) => ({ id: r.id, question: r.question, code: r.code ?? "", options: r.options ?? [] }));
  return NextResponse.json({ questions, subject, level });
}

// POST — grade a submitted round, credit capped reward points, record it.
export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const responses: Response[] = Array.isArray(body?.responses)
    ? body.responses.map((r: any) => ({ id: String(r?.id ?? ""), chosen: Number(r?.chosen) })).filter((r: Response) => r.id)
    : [];
  const subject = String(body?.subject ?? "").trim().slice(0, 80);
  const level = String(body?.level ?? "").trim().slice(0, 40);
  if (!responses.length) return NextResponse.json({ error: "No answers submitted." }, { status: 400 });

  const admin = supabaseAdmin();
  const ids = responses.map((r) => r.id);

  // Re-read the answer key straight from the bank — only real bank questions count.
  const { data: keyRows, error: keyErr } = await admin.from("question_bank").select("id, answer, subject, topic").in("id", ids);
  if (keyErr) return NextResponse.json({ error: explain(keyErr.message) }, { status: 500 });
  const key = (keyRows ?? []).map((r: any) => ({ id: r.id, answer: Number(r.answer) }));
  if (!key.length) return NextResponse.json({ error: "Those questions are no longer available." }, { status: 400 });

  const { correct, total, results } = gradeAnswers(key, responses);

  // Accumulate per-topic mastery for the skill tree (best-effort).
  const meta = new Map((keyRows ?? []).map((r: any) => [r.id, { subject: String(r.subject ?? subject), topic: String(r.topic ?? "") }]));
  await recordTopicMastery(admin, gate.user.id, aggregateTopics(results, meta));

  // Daily cap: sum points already earned from practice today (WAT).
  const day = watDay();
  const { data: todays } = await admin.from("practice_sessions")
    .select("points").eq("student_id", gate.user.id).eq("day", day);
  const awardedToday = (todays ?? []).reduce((a: number, r: any) => a + Number(r.points || 0), 0);
  const points = practicePoints(correct, awardedToday) * await happyHourMultiplier(admin); // 2× during Happy Hour

  await admin.from("practice_sessions").insert({
    student_id: gate.user.id, subject, level, total, correct, points, day,
  });

  let newTotal = Number(gate.points);
  if (points > 0) {
    newTotal += points;
    await admin.from("profiles").update({ reward_points: newTotal }).eq("id", gate.user.id);
  }

  const capReached = points === 0 && correct > 0;
  return NextResponse.json({ correct, total, points, results, capReached, dailyCap: PRACTICE_DAILY_CAP, newTotal });
}
