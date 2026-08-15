// profiles.reward_points is a SINGLE running total that many things add to:
// practice, mocks, flashcards, daily quests, the daily chest, referrals AND
// positive behaviour points an admin awards. So behaviour changes must ADJUST
// that total by a delta — never recompute-and-overwrite it (that wiped every
// earned bonus). profiles.sanction_points is behaviour-only, so it's safe to
// recompute from the logs. Pure so the rule is unit-testable.

// Sanctions = the sum of non-positive behaviour points (stored negative).
export function sanctionFromPoints(points: number[]): number {
  return points.reduce((a, p) => a + (Number(p) <= 0 ? Number(p) : 0), 0);
}

// How much a single behaviour log moves reward_points: only positive behaviour
// adds to the earned total; negatives are sanctions and never reduce it (the
// leaderboard total never drops).
export function rewardDeltaForLog(points: number): number {
  const p = Number(points) || 0;
  return p > 0 ? p : 0;
}

// Apply a delta to the running total, clamped at zero.
export function nextRewardTotal(current: number, delta: number): number {
  return Math.max(0, Math.round(Number(current) || 0) + Math.round(Number(delta) || 0));
}
