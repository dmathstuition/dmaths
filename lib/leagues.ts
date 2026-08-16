// Leagues — a Duolingo-style layer over the reward economy, in two parts:
//
//  • Divisions: a tier you climb as your LIFETIME reward_points grow (Bronze →
//    Diamond). Persistent identity, no reset — you're only ever promoted.
//  • Weekly Tournament: a leaderboard of points earned THIS WEEK, resetting every
//    week via a per-week baseline snapshot (same mechanism as monthly seasons).
//
// All pure so thresholds, progress and the week key are unit-testable; the page
// reads totals with the service role and does the snapshot.

export type Division = { name: string; min: number; emoji: string; accent: string };

// Ordered low → high. `min` is the lifetime-points threshold to enter the tier.
// One source of truth for the whole app — the dashboard momentum ring, the
// league strip and the Leagues page all read these, so the numbers always agree.
export const DIVISIONS: Division[] = [
  { name: "Bronze",   min: 0,    emoji: "🥉", accent: "#B87333" },
  { name: "Silver",   min: 100,  emoji: "🥈", accent: "#9CA3AF" },
  { name: "Gold",     min: 300,  emoji: "🥇", accent: "#EFAE56" },
  { name: "Platinum", min: 600,  emoji: "💠", accent: "#5EA7C7" },
  { name: "Diamond",  min: 1000, emoji: "💎", accent: "#8B7BE8" },
];

// The division a lifetime total sits in (the highest tier whose min it meets).
export function divisionIndex(points: number): number {
  const p = Math.max(0, Number(points) || 0);
  let idx = 0;
  for (let i = 0; i < DIVISIONS.length; i++) if (p >= DIVISIONS[i].min) idx = i;
  return idx;
}
export function divisionFor(points: number): Division {
  return DIVISIONS[divisionIndex(points)];
}
export function nextDivision(points: number): Division | null {
  const i = divisionIndex(points);
  return i + 1 < DIVISIONS.length ? DIVISIONS[i + 1] : null;
}

// Progress toward the next tier — for a progress bar and a "N points to Silver".
export function progressToNext(points: number): {
  current: Division; next: Division | null; remaining: number; pct: number;
} {
  const p = Math.max(0, Number(points) || 0);
  const current = divisionFor(p);
  const next = nextDivision(p);
  if (!next) return { current, next: null, remaining: 0, pct: 100 };
  const span = next.min - current.min;
  const pct = span > 0 ? Math.max(0, Math.min(100, Math.round(((p - current.min) / span) * 100))) : 0;
  return { current, next, remaining: Math.max(0, next.min - p), pct };
}

// The current WAT week, keyed by its Monday's date (YYYY-MM-DD) — stable all week.
export function leagueWeek(now: Date = new Date()): string {
  const wat = new Date(now.getTime() + 60 * 60 * 1000); // shift to WAT wall-clock
  const sinceMonday = (wat.getUTCDay() + 6) % 7;
  wat.setUTCDate(wat.getUTCDate() - sinceMonday);
  return wat.toISOString().slice(0, 10);
}

// Points earned since the week's baseline snapshot (never negative).
export function weeklyPoints(total: number | null | undefined, baseline: number | null | undefined): number {
  return Math.max(0, (Number(total) || 0) - (Number(baseline) || 0));
}
