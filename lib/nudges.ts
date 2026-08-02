// Decides which (if any) engagement nudge a learner should get today, from their
// streak state. Pure + deterministic (unit-tested).
//
// NOTE: these conditions are true for the WHOLE day, so this function alone does
// NOT stop repeats — the caller must check whether the learner was already
// nudged today (see app/api/reminders/nudges/route.ts). Getting that wrong once
// sent a learner a push on every cron run.

export type NudgeKind = "streak" | "inactive";
export type Nudge = { kind: NudgeKind; title: string; body: string };

// Titles are STABLE (the streak count lives in the body) so the sender can look
// them up to check whether a learner has already been nudged today. Changing
// these strings breaks that dedupe — update the cleanup SQL too if you do.
export const STREAK_TITLE = "🔥 Keep your streak going!";
export const INACTIVE_TITLE = "We've missed you 👋";
export const DAILY_REWARD_TITLE = "🎁 Your daily reward is waiting";
export const DUE_CARDS_TITLE = "🧠 Revision cards are due";

// The WAT hour from which the daily-reward chest reminder may fire — late enough
// that most learners who'd open it naturally already have, so it lands as an
// evening "before midnight" nudge however often the cron runs.
export const DAILY_REWARD_HOUR = 16;

// Whole days between a YYYY-MM-DD date and "today" (UTC date math on date-only
// values — no time component, so DST/timezone drift can't skew the day count).
export function daysSince(dateStr: string, today: Date = new Date()): number {
  const a = Date.parse(`${dateStr}T00:00:00Z`);
  const b = Date.parse(`${today.toISOString().slice(0, 10)}T00:00:00Z`);
  if (isNaN(a) || isNaN(b)) return NaN;
  return Math.round((b - a) / 86_400_000);
}

export function nudgeFor(streakCount: number, streakLastDate: string | null, today: Date = new Date()): Nudge | null {
  if (!streakLastDate) return null;               // never active → not a re-engagement target
  const days = daysSince(streakLastDate, today);
  if (isNaN(days) || days < 0) return null;

  // Streak about to break: active yesterday, not yet today.
  if (streakCount >= 2 && days === 1) {
    return {
      kind: "streak",
      title: STREAK_TITLE,
      body: `You're on a ${streakCount}-day streak — open D-Maths today so it doesn't reset tonight.`,
    };
  }
  // "We've missed you": exactly 7 and 14 days idle (so at most two nudges).
  if (days === 7 || days === 14) {
    return {
      kind: "inactive",
      title: INACTIVE_TITLE,
      body: "Jump back in — new lessons and challenges are waiting for you.",
    };
  }
  return null;
}
