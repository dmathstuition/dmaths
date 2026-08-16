import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { watDay } from "@/lib/dailyReward";
import { pickRandom } from "@/lib/questionBank";
import { gradeAnswers, type Response } from "@/lib/practice";
import { presetByKey, topicBreakdown, scorePercent, gradeBand, MOCK_DAILY_BONUS } from "@/lib/mockExam";
import { canStart } from "@/lib/mockRequests";
import { boostMultiplier } from "@/lib/powerups";
import { happyHourMultiplier } from "@/lib/happyHour";
import { aggregateTopics } from "@/lib/skillTree";
import { recordTopicMastery } from "@/lib/topicMastery";

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
  const preset = url.searchParams.get("preset")?.trim() ?? "";
  const requestId = url.searchParams.get("requestId")?.trim() ?? "";
  const admin = supabaseAdmin();

  // Start a paper — only from an approved, in-window request (class-filtered).
  if (requestId) {
    const { data: rq } = await admin.from("mock_requests")
      .select("id, student_id, subject, preset, level, status, scheduled_for").eq("id", requestId).maybeSingle();
    if (!rq || rq.student_id !== gate.user.id) return NextResponse.json({ error: "That mock request wasn't found." }, { status: 404 });
    if (!canStart(rq)) return NextResponse.json({ error: "This mock isn't open yet." }, { status: 403 });

    // Consume the request on start so the paper can't be re-rolled.
    await admin.from("mock_requests").update({ status: "used", used_at: new Date().toISOString() }).eq("id", requestId);

    // The learner's exam target on this request (best-effort — column may be new).
    const { data: exRow } = await admin.from("mock_requests").select("exam").eq("id", requestId).maybeSingle();
    const examTarget = (exRow as any)?.exam ?? "";

    const p = presetByKey(rq.preset);
    const filtered = (cols: string) => {
      let q = admin.from("question_bank").select(cols).limit(600);
      if (rq.subject) q = q.eq("subject", rq.subject);
      if (rq.level) q = q.eq("level", rq.level); // scoped to the learner's class
      return q;
    };
    let { data, error } = await filtered("id, question, code, options, exam");
    let examUsable = true;
    if (error && /column .*exam/i.test(error.message)) { examUsable = false; ({ data, error } = await filtered("id, question, code, options")); }
    if (error) return NextResponse.json({ error: explain(error.message), questions: [] }, { status: 200 });

    // Prefer questions tagged with the learner's exam, filling from the rest of
    // their class so a paper is always complete.
    const rows = data ?? [];
    let picked: any[];
    if (examTarget && examUsable) {
      const matched = pickRandom(rows.filter((r: any) => (r.exam || "") === examTarget), p.count);
      picked = matched.length >= p.count ? matched
        : [...matched, ...pickRandom(rows.filter((r: any) => (r.exam || "") !== examTarget), p.count - matched.length)];
    } else {
      picked = pickRandom(rows, p.count);
    }
    const questions = picked.map((r: any) => ({ id: r.id, question: r.question, code: r.code ?? "", options: r.options ?? [] }));
    return NextResponse.json({ questions, preset: p.key, minutes: p.minutes, subject: rq.subject, level: rq.level });
  }

  // A raw preset self-start is no longer allowed — mocks must be requested.
  if (preset) {
    return NextResponse.json({ error: "Request a mock and wait for approval before starting." }, { status: 403 });
  }

  {
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

  const { data: keyRows, error: keyErr } = await admin.from("question_bank").select("id, answer, subject, topic").in("id", ids);
  if (keyErr) return NextResponse.json({ error: explain(keyErr.message) }, { status: 500 });
  const key = (keyRows ?? []).map((r: any) => ({ id: r.id, answer: Number(r.answer) }));
  if (!key.length) return NextResponse.json({ error: "Those questions are no longer available." }, { status: 400 });
  const topicById = new Map((keyRows ?? []).map((r: any) => [r.id, String(r.topic ?? "")]));

  const { correct, total, results } = gradeAnswers(key, responses);
  const percent = scorePercent(correct, total);
  const band = gradeBand(percent);
  const topics = topicBreakdown(results.map((r) => ({ topic: topicById.get(r.id) ?? "", correct: r.correct })));

  // Accumulate per-topic mastery for the skill tree (best-effort).
  const meta = new Map((keyRows ?? []).map((r: any) => [r.id, { subject: String(r.subject ?? subject), topic: String(r.topic ?? "") }]));
  await recordTopicMastery(admin, gate.user.id, aggregateTopics(results, meta));

  // Completion bonus — only for the first finished mock each day (anti-farm),
  // doubled while a 2× Points Boost is active.
  const day = watDay();
  const [{ data: earlier }, { data: boostRow }] = await Promise.all([
    admin.from("mock_exam_sessions").select("id").eq("student_id", gate.user.id).eq("day", day).limit(1),
    admin.from("profiles").select("boost_until").eq("id", gate.user.id).single(),
  ]);
  const mult = Math.max(boostMultiplier((boostRow as any)?.boost_until), await happyHourMultiplier(admin));
  const points = earlier && earlier.length ? 0 : MOCK_DAILY_BONUS * mult;

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
