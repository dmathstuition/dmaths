import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { parseSelfCheck, SELF_CHECK_MAX } from "@/lib/selfCheck";

// Learner "Check my work": they type a question and their working; the A.I marks
// the working out of 10 and gives feedback. It reads the TYPED text (the model
// can't see an uploaded photo) — the photo is for the learner's own record and
// their tutor. Formative only, so there's no reward to game.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-selfcheck:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const question = String(b?.question ?? "").trim().slice(0, 2000);
  const work = String(b?.work ?? "").trim().slice(0, 4000);
  if (!question || !work) return NextResponse.json({ error: "Add the question and your working first." }, { status: 400 });

  const system = `You are a supportive maths tutor at D-Maths marking a Nigerian learner's working (WAEC/JAMB style). You are given the question and the learner's typed working/answer.

Mark it out of ${SELF_CHECK_MAX} for correctness AND method (award method marks even if the final answer is wrong).
Write 2–4 sentences of feedback to the learner: what they did well, the key error if any, and the correct approach or final answer. Plain English, encouraging, no markdown.

Return ONLY strict JSON in this shape:
{"mark": 0, "feedback": "..."}`;

  const userMsg = `Question:\n${question}\n\nLearner's working/answer:\n${work}`;

  let text: string;
  try {
    text = await aiChat({ system, user: userMsg, maxTokens: 500 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ mark?: number; feedback?: string }>(text);
  if (!parsed) {
    // The model didn't return JSON — still hand back its prose as feedback.
    return NextResponse.json({ mark: null, feedback: text.slice(0, 2000) });
  }
  return NextResponse.json(parseSelfCheck(parsed));
}
