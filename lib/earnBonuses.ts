// Reward-point bonuses that tie earning to real schoolwork + streak milestones.
// Pure so the values and rules are one source of truth and unit-testable; the
// routes read/write reward_points (always by delta, never overwrite).

export const SUBMIT_BONUS  = 5;   // completing a CBT / graded assignment
export const ONTIME_BONUS  = 5;   // a CBT submitted before it closed
export const PERFECT_BONUS = 10;  // 100%

// Points for finishing a CBT: completion + on-time + perfect.
export function cbtBonus(opts: { perfect: boolean; onTime: boolean }): number {
  return SUBMIT_BONUS + (opts.onTime ? ONTIME_BONUS : 0) + (opts.perfect ? PERFECT_BONUS : 0);
}

// Points when a (file) assignment is graded: completion + perfect. On-time isn't
// known at grade time, so it isn't awarded here.
export function gradedAssignmentBonus(gradePercent: number): number {
  return SUBMIT_BONUS + (Number(gradePercent) >= 100 ? PERFECT_BONUS : 0);
}

// Streak-milestone payouts. A bonus is paid the day the streak reaches one of
// these lengths (the ping advances once a day, so each milestone pays once per
// climb).
export const STREAK_MILESTONES: Record<number, number> = { 7: 20, 14: 35, 30: 75, 60: 150, 100: 300 };

export function streakMilestoneBonus(newStreak: number): number {
  return STREAK_MILESTONES[Math.round(Number(newStreak) || 0)] ?? 0;
}
