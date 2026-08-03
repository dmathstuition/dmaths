// Power-ups — consumable perks bought with reward points. Two to start:
//   • Streak Freeze — auto-protects your streak if you miss a single day.
//   • 2× Points Boost — doubles reward points from practice, mocks & cards for
//     one hour.
// Kept pure so the buy API, the streak ping, and the earn routes share one
// source of truth and the rules are unit-testable.

export type PowerUp = { key: string; name: string; blurb: string; cost: number; icon: string };

export const POWERUPS: PowerUp[] = [
  { key: "freeze", name: "Streak Freeze",   blurb: "Auto-protects your streak if you miss a day.",              cost: 60, icon: "flame" },
  { key: "boost",  name: "2× Points Boost", blurb: "Doubles points from mock exams & flashcards for 1 hour.",   cost: 90, icon: "zap" },
];

export const BOOST_MS = 3_600_000; // one hour

export function powerUpByKey(key: string | null | undefined): PowerUp | null {
  return POWERUPS.find((p) => p.key === key) ?? null;
}

// Is a 2× boost currently running?
export function boostActive(boostUntil: string | null | undefined, now: Date = new Date()): boolean {
  return !!boostUntil && new Date(boostUntil).getTime() > now.getTime();
}

// The point multiplier to apply at earn time (2 while a boost is live, else 1).
export function boostMultiplier(boostUntil: string | null | undefined, now: Date = new Date()): number {
  return boostActive(boostUntil, now) ? 2 : 1;
}

// Resolve the next streak value, honouring a Streak Freeze. A one-day gap can be
// saved by a freeze (consuming one); a longer absence still resets. Pure and
// date-string based (YYYY-MM-DD, WAT) so it's deterministic and testable.
export function resolveStreak(opts: {
  prevStreak: number;
  lastDate: string | null | undefined;
  freezes: number;
  today: string;
}): { streak: number; keptByFreeze: boolean; unchanged: boolean } {
  const { prevStreak, lastDate, freezes, today } = opts;
  const prev = Math.max(0, Number(prevStreak) || 0);
  if (!lastDate) return { streak: 1, keptByFreeze: false, unchanged: false };
  if (lastDate === today) return { streak: prev, keptByFreeze: false, unchanged: true };

  const day = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const gap = Math.round((day(today) - day(String(lastDate).slice(0, 10))) / 86_400_000);

  if (gap === 1) return { streak: prev + 1, keptByFreeze: false, unchanged: false };          // consecutive day
  if (gap === 2 && freezes > 0) return { streak: prev + 1, keptByFreeze: true, unchanged: false }; // one missed day → freeze saves it
  return { streak: 1, keptByFreeze: false, unchanged: false };                                 // reset
}
