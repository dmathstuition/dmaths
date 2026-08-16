// Question generator for the Math Sprint mini-game. Pure (RNG injectable) so the
// answers can be checked in tests. Answers are always non-negative integers.

export type Question = { text: string; answer: number };

// The sprint climbs through stages of increasing difficulty. A learner clears a
// stage by getting SPRINT_ADVANCE answers right, then the questions get harder.
export type SprintStage = { stage: number; name: string; hint: string };

export const SPRINT_STAGES: SprintStage[] = [
  { stage: 1, name: "Warm-up", hint: "add & subtract to 100" },
  { stage: 2, name: "Steady", hint: "times tables to 12" },
  { stage: 3, name: "Quick", hint: "bigger sums, mixed operations" },
  { stage: 4, name: "Sharp", hint: "division & two-step sums" },
  { stage: 5, name: "Genius", hint: "squares & harder two-steppers" },
];

export const MAX_STAGE = SPRINT_STAGES.length;
export const SPRINT_ADVANCE = 5; // correct answers needed to clear a stage

const clampStage = (s: number) => Math.max(1, Math.min(MAX_STAGE, Math.floor(s) || 1));
const pick = <T,>(arr: readonly T[], r: number) => arr[Math.floor(r * arr.length)] ?? arr[0];

// Original single-difficulty question — kept as the stage-1 baseline and as the
// instant local fallback while the A.I pool loads. Non-negative subtraction only.
export function makeQuestion(rand: () => number = Math.random): Question {
  const ops = ["+", "−", "×"] as const;
  const op = ops[Math.floor(rand() * ops.length)];
  let a: number, b: number, answer: number;

  if (op === "×") {
    a = 2 + Math.floor(rand() * 11); // 2..12
    b = 2 + Math.floor(rand() * 11);
    answer = a * b;
  } else if (op === "+") {
    a = 2 + Math.floor(rand() * 98); // 2..99
    b = 2 + Math.floor(rand() * 98);
    answer = a + b;
  } else {
    a = 10 + Math.floor(rand() * 90); // 10..99
    b = 1 + Math.floor(rand() * a);   // 1..a  → answer never negative
    answer = a - b;
  }

  return { text: `${a} ${op} ${b}`, answer };
}

// A question scaled to a stage's difficulty. Always resolves to a non-negative
// integer, so it can be checked exactly against a typed answer.
export function makeStagedQuestion(stage: number, rand: () => number = Math.random): Question {
  const s = clampStage(stage);
  const n = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  if (s === 1) {
    // add & subtract to 100 (subtraction bounded to stay non-negative)
    if (rand() < 0.5) { const a = n(2, 99), b = n(2, 99); return { text: `${a} + ${b}`, answer: a + b }; }
    const a = n(20, 99), b = n(1, a); return { text: `${a} − ${b}`, answer: a - b };
  }
  if (s === 2) {
    // times tables to 12
    const a = n(2, 12), b = n(2, 12); return { text: `${a} × ${b}`, answer: a * b };
  }
  if (s === 3) {
    // bigger sums, mixed operations
    const r = rand();
    if (r < 0.34) { const a = n(100, 999), b = n(100, 999); return { text: `${a} + ${b}`, answer: a + b }; }
    if (r < 0.67) { const a = n(200, 999), b = n(50, a); return { text: `${a} − ${b}`, answer: a - b }; }
    const a = n(6, 19), b = n(6, 19); return { text: `${a} × ${b}`, answer: a * b };
  }
  if (s === 4) {
    // division (exact) & two-step sums
    if (rand() < 0.5) { const b = n(2, 12), q = n(2, 12), a = b * q; return { text: `${a} ÷ ${b}`, answer: q }; }
    const a = n(2, 12), b = n(2, 12), c = n(2, 40); return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
  }
  // stage 5 — squares & harder two-steppers
  if (rand() < 0.5) { const a = n(10, 30); return { text: `${a}²`, answer: a * a }; }
  const a = n(6, 15), b = n(6, 15), c = n(2, Math.min(a * b, 60));
  return { text: `${a} × ${b} − ${c}`, answer: a * b - c };
}

// Build a de-duplicated pool of questions for a stage (used to prime a round).
export function makeStagePool(stage: number, size: number, rand: () => number = Math.random): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < size && guard++ < size * 8) {
    const q = makeStagedQuestion(stage, rand);
    if (seen.has(q.text)) continue;
    seen.add(q.text);
    out.push(q);
  }
  return out;
}

// Sanitise questions coming back from the A.I: keep only those with text and a
// finite non-negative integer answer, and drop duplicates. Pure + testable.
export function cleanSprintBatch(raw: Partial<Question>[]): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (const r of raw ?? []) {
    const text = String(r?.text ?? "").trim().slice(0, 60);
    const answer = Number(r?.answer);
    if (!text) continue;
    if (!Number.isInteger(answer) || answer < 0) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ text, answer });
  }
  return out;
}
