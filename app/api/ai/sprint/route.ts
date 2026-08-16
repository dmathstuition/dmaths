import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { SPRINT_STAGES, cleanSprintBatch, makeStagePool, type Question } from "@/lib/mathSprint";

// Generate a staged Math Sprint with the A.I: a pool of quick mental-maths
// questions per stage, difficulty climbing stage by stage. Any signed-in learner
// can call it (the sprint is just-for-fun with no reward, so there's nothing to
// game); it's rate-limited because each call is a paid model request. If the A.I
// is off or returns too few, the client falls back to the local generator, so
// the game never blocks on this.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_STAGE = 12;

export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-sprint:${user.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const stageSpec = SPRINT_STAGES.map((s) => `Stage ${s.stage} (${s.name}): ${s.hint}.`).join("\n");
  const system = `You are the question setter for D-Maths' "Math Sprint", a fast mental-maths game for Nigerian primary/secondary learners. Produce quick questions a learner can answer in their head in a few seconds.

Write exactly ${PER_STAGE} questions for EACH of these ${SPRINT_STAGES.length} stages, difficulty climbing stage by stage:
${stageSpec}

RULES:
- "text" is the sum to show on screen, using × ÷ − and + (or a trailing ² for squares). No words, no equals sign, no answer inside it.
- "answer" is the single correct result as a non-negative integer.
- Keep every answer a whole number ≥ 0 (no fractions, no negatives). Vary the numbers; no duplicates within a stage.

Return ONLY strict JSON, no prose, in this exact shape:
{"stages":[{"stage":1,"questions":[{"text":"7 + 8","answer":15}]}]}`;

  let text: string;
  try {
    text = await aiChat({ system, user: "Generate the staged sprint now.", maxTokens: 3000 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ stages?: { stage?: number; questions?: Partial<Question>[] }[] }>(text);
  const rawStages = Array.isArray(parsed?.stages) ? parsed!.stages! : [];

  // Assemble one clean pool per defined stage, topping up from the local
  // generator if the A.I came up short so every stage is always playable.
  const stages = SPRINT_STAGES.map((s) => {
    const match = rawStages.find((r) => Number(r?.stage) === s.stage);
    let questions = cleanSprintBatch(match?.questions ?? []);
    if (questions.length < PER_STAGE) {
      const seen = new Set(questions.map((q) => q.text));
      for (const q of makeStagePool(s.stage, PER_STAGE)) {
        if (questions.length >= PER_STAGE) break;
        if (!seen.has(q.text)) { seen.add(q.text); questions.push(q); }
      }
    }
    return { stage: s.stage, name: s.name, questions: questions.slice(0, PER_STAGE) };
  });

  return NextResponse.json({ stages });
}
