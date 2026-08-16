// "Recommended for you" practice — pick out the topics a learner is weakest at,
// from the mastery tallies they build up as they practise, so the next round can
// target exactly those. Pure so the selection rules are unit-testable; the API
// reads topic_mastery and pulls questions in the returned topics.

export const MIN_TOPIC_ATTEMPTS = 4;   // need a few attempts before a topic is judged
export const WEAK_ACCURACY = 80;       // at/above this % a topic counts as mastered

export type MasteryRow = { subject: string; topic: string; correct: number; total: number };
export type WeakTopic = { subject: string; topic: string; accuracy: number; total: number };

export function topicAccuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((Math.max(0, correct) / total) * 100) : 0;
}

// Weakest topics first (lowest accuracy), among those with enough attempts and
// still below mastery. Ties break toward more attempts (stronger evidence).
export function weakestTopics(
  rows: MasteryRow[],
  opts?: { minAttempts?: number; limit?: number; threshold?: number },
): WeakTopic[] {
  const minAttempts = opts?.minAttempts ?? MIN_TOPIC_ATTEMPTS;
  const threshold = opts?.threshold ?? WEAK_ACCURACY;
  const limit = opts?.limit ?? 3;
  return (rows ?? [])
    .filter((r) => r.topic && (Number(r.total) || 0) >= minAttempts)
    .map((r) => ({ subject: r.subject, topic: r.topic, accuracy: topicAccuracy(r.correct, r.total), total: r.total }))
    .filter((r) => r.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, limit);
}
