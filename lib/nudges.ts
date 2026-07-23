// Decides which (if any) engagement nudge a learner should get today, from their
// streak state. Pure + deterministic (unit-tested). The date-based conditions
// self-dedupe: each nudge only fires on a specific day, so a once-daily cron
// never spams the same learner.

export type NudgeKind = "streak" | "inactive";
export type Nudge = { kind: NudgeKind; title: string; body: string };

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
      title: `🔥 Keep your ${streakCount}-day streak!`,
      body: "Open D-Maths today so your streak doesn't reset tonight.",
    };
  }
  // "We've missed you": exactly 7 and 14 days idle (so at most two nudges).
  if (days === 7 || days === 14) {
    return {
      kind: "inactive",
      title: "We've missed you 👋",
      body: "Jump back in — new lessons and challenges are waiting for you.",
    };
  }
  return null;
}
