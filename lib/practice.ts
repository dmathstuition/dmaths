// Pure grading & scoring for the self-practice quiz. Kept free of I/O so the
// rules (and the anti-farming cap) can be unit-tested. The API layer reads the
// answer key with the service role and calls these.

export const PRACTICE_PER_CORRECT = 2;   // reward points per correct answer
export const PRACTICE_DAILY_CAP = 30;    // most a learner can earn from practice per day
export const PRACTICE_COUNTS = [5, 10, 15] as const;

export type AnswerKey = { id: string; answer: number };
export type Response = { id: string; chosen: number };
export type Result = { id: string; correct: boolean; answer: number; chosen: number };

// Grade responses against the key. Only questions present in the key count, and
// a missing/blank response is simply wrong — never a crash.
export function gradeAnswers(key: AnswerKey[], responses: Response[]): { correct: number; total: number; results: Result[] } {
  const chosenById = new Map(responses.map((r) => [r.id, Number(r.chosen)]));
  const results: Result[] = key.map((q) => {
    const chosen = chosenById.has(q.id) ? Number(chosenById.get(q.id)) : -1;
    return { id: q.id, correct: chosen === q.answer, answer: q.answer, chosen };
  });
  return { correct: results.filter((r) => r.correct).length, total: key.length, results };
}

// Points for a round: perCorrect each, but never past what's left of the daily
// cap. Clamped to zero so a bad/over-cap day can't ever go negative.
export function practicePoints(
  correct: number,
  awardedToday: number,
  { perCorrect = PRACTICE_PER_CORRECT, cap = PRACTICE_DAILY_CAP }: { perCorrect?: number; cap?: number } = {},
): number {
  const raw = Math.max(0, Math.floor(correct)) * perCorrect;
  const remaining = Math.max(0, cap - Math.max(0, awardedToday));
  return Math.max(0, Math.min(raw, remaining));
}
