import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { watDay } from "@/lib/dailyReward";
import { pickRandom } from "@/lib/questionBank";
import { gradeAnswers, type Response } from "@/lib/practice";
import { presetByKey, topicBreakdown, scorePercent, gradeBand, MOCK_DAILY_BONUS } from "@/lib/mockExam";

// Mock Exam mode. A timed, exam-style paper is pulled from the staff-only
// question_bank and marked here with the service role, so the answer key never
// reaches the browser before the paper is submitted. Finishing your first mock
// of the day earns a small flat bonus (capped once/day so it can't be farmed);
// the result — percentage, WAEC-style grade band, and a per-topic breakdown —
// is saved so the learner can track exam readiness.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*(mock_exam_sessions|question_bank)/i.test(m)
    ? "Mock exams need migration-mock-exam.sql (and migration-question-bank.sql) — run them in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, points: me?.reward_points ?? 0 };
}

// GET — with `preset`: a fresh exam (answers stripped, timer minutes included).
// Otherwise: the filter options in the bank + the learner's recent mock history.
export async function GET(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject")?.trim() ?? "";
  const level = url.searchParams.get("level")?.trim() ?? "";
  const preset = url.searchParams.get("preset")?.trim() ?? "";
  const admin = supabaseAdmin();

  if (!preset) {
    const [{ data: bank, error }, hist] = await Promise.all([
      admin.from("question_bank").select("subject, level").limit(3000),
      admin.from("mock_exam_sessions")
        .select("id, preset, subject, correct, total, percent, band, created_at")
        .eq("student_id", gate.user.id).order("created_at", { ascending: false }).limit(5),
    ]);
    if (error) return NextResponse.json({ error: explain(error.message), subjects: [], levels: [], total: 0, history: [] }, { status: 200 });
    const rows = bank ?? [];
    const subjects = Array.from(new Set(rows.map((r: any) => r.subject).filter(Boolean))).sort();
    const levels = Array.from(new Set(rows.map((r: any) => r.level).filter(Boolean))).sort();
    return NextResponse.json({ subjects, levels, total: rows.length, history: hist.data ?? [] });
  }

  // A round: pull the matching pool, pick the preset's count at random, strip answers.
  const p = presetByKey(preset);
  let q = admin.from("question_bank").select("id, question, code, options").limit(600);
  if (subject) q = q.eq("subject", subject);
  if (level) q = q.eq("level", level);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: explain(error.message), questions: [] }, { status: 200 });

  const picked = pickRandom(data ?? [], p.count);
  const questions = picked.map((r: any) => ({ id: r.id, question: r.question, code: r.code ?? "", options: r.options ?? [] }));
  return NextResponse.json({ questions, preset: p.key, minutes: p.minutes, subject, level });
}

// POST — grade a submitted paper, save it, credit the once-a-day completion bonus.
export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const responses: Response[] = Array.isArray(body?.responses)
    ? body.responses.map((r: any) => ({ id: String(r?.id ?? ""), chosen: Number(r?.chosen) })).filter((r: Response) => r.id)
    : [];
  const preset = presetByKey(String(body?.preset ?? ""));
  const subject = String(body?.subject ?? "").trim().slice(0, 80);
  const level = String(body?.level ?? "").trim().slice(0, 40);
  if (!responses.length) return NextResponse.json({ error: "No answers submitted." }, { status: 400 });

  const admin = supabaseAdmin();
  const ids = responses.map((r) => r.id);

  const { data: keyRows, error: keyErr } = await admin.from("question_bank").select("id, answer, topic").in("id", ids);
  if (keyErr) return NextResponse.json({ error: explain(keyErr.message) }, { status: 500 });
  const key = (keyRows ?? []).map((r: any) => ({ id: r.id, answer: Number(r.answer) }));
  if (!key.length) return NextResponse.json({ error: "Those questions are no longer available." }, { status: 400 });
  const topicById = new Map((keyRows ?? []).map((r: any) => [r.id, String(r.topic ?? "")]));

  const { correct, total, results } = gradeAnswers(key, responses);
  const percent = scorePercent(correct, total);
  const band = gradeBand(percent);
  const topics = topicBreakdown(results.map((r) => ({ topic: topicById.get(r.id) ?? "", correct: r.correct })));

  // Completion bonus — only for the first finished mock each day (anti-farm).
  const day = watDay();
  const { data: earlier } = await admin.from("mock_exam_sessions")
    .select("id").eq("student_id", gate.user.id).eq("day", day).limit(1);
  const points = earlier && earlier.length ? 0 : MOCK_DAILY_BONUS;

  await admin.from("mock_exam_sessions").insert({
    student_id: gate.user.id, preset: preset.key, subject, level,
    total, correct, percent, band: band.grade, points, day,
  });

  let newTotal = Number(gate.points);
  if (points > 0) {
    newTotal += points;
    await admin.from("profiles").update({ reward_points: newTotal }).eq("id", gate.user.id);
  }

  return NextResponse.json({ correct, total, percent, band, topics, results, points, newTotal });
}
