// Pure logic for Mock Exam mode — timed, exam-style papers pulled from the
// question bank and auto-marked. Kept free of I/O so the presets, WAEC-style
// grade bands, topic breakdown and completion reward can be unit-tested; the
// API layer reads the answer key with the service role and calls these.

export type ExamPreset = {
  key: string;
  label: string;
  blurb: string;
  count: number;    // number of questions
  minutes: number;  // time limit
};

// Nigerian exam-prep flavours. Question counts are capped by what the bank
// actually holds at round time, so a small bank still yields a shorter paper.
export const EXAM_PRESETS: ExamPreset[] = [
  { key: "quick", label: "Quick mock", blurb: "A short warm-up",          count: 20, minutes: 20 },
  { key: "waec",  label: "WAEC style", blurb: "SSCE-length paper",        count: 30, minutes: 45 },
  { key: "jamb",  label: "JAMB style", blurb: "UTME pace, one mark each", count: 40, minutes: 40 },
];

export function presetByKey(key: string | null | undefined): ExamPreset {
  return EXAM_PRESETS.find((p) => p.key === key) ?? EXAM_PRESETS[0];
}

// Flat reward for finishing your first mock of the day — enough to nudge the
// habit, capped to once/day (enforced server-side) so it can't be farmed.
export const MOCK_DAILY_BONUS = 5;

export type Band = { grade: string; label: string; pass: boolean };

// WASSCE nine-point grade from a percentage. A1 is the best, F9 a fail.
export function gradeBand(pct: number): Band {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (p >= 75) return { grade: "A1", label: "Excellent", pass: true };
  if (p >= 70) return { grade: "B2", label: "Very good", pass: true };
  if (p >= 65) return { grade: "B3", label: "Good",      pass: true };
  if (p >= 60) return { grade: "C4", label: "Credit",    pass: true };
  if (p >= 55) return { grade: "C5", label: "Credit",    pass: true };
  if (p >= 50) return { grade: "C6", label: "Credit",    pass: true };
  if (p >= 45) return { grade: "D7", label: "Pass",      pass: true };
  if (p >= 40) return { grade: "E8", label: "Pass",      pass: true };
  return { grade: "F9", label: "Fail", pass: false };
}

export function scorePercent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export type TopicResult = { topic: string; correct: number; total: number; pct: number };

// Aggregate graded results by topic, weakest first — the "focus areas" table
// that tells a learner where the marks were lost.
export function topicBreakdown(items: { topic: string; correct: boolean }[]): TopicResult[] {
  const map = new Map<string, { correct: number; total: number }>();
  for (const it of items) {
    const topic = (it.topic || "General").trim() || "General";
    const cur = map.get(topic) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (it.correct) cur.correct += 1;
    map.set(topic, cur);
  }
  return Array.from(map.entries())
    .map(([topic, v]) => ({ topic, correct: v.correct, total: v.total, pct: scorePercent(v.correct, v.total) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
}
