// Leaderboard "seasons" — a monthly competition layered on top of the all-time
// board, plus a Hall of Fame of past champions.
//
// reward_points on profiles is a lifetime total that never drops (it's also the
// shop currency), so we never reset it. Instead we snapshot each learner's total
// at the start of a season ("baseline"). A learner's season score is then just
//   total − baseline
// and the difference between two consecutive months' baselines is exactly what
// they earned in the earlier month — which is how past champions are computed,
// without having to touch every place that awards points.

// The season a date falls in, as 'YYYY-MM' on the WAT calendar.
export function currentSeason(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }).slice(0, 7);
}

// 'YYYY-MM' → "August 2026" for display.
export function seasonLabel(season: string): string {
  const [y, m] = season.split("-").map(Number);
  if (!y || !m) return season;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Points earned this season = lifetime total minus the season's baseline, never
// negative (a fresh baseline equals the total, so it starts at 0).
export function seasonPoints(total: number | null | undefined, baseline: number | null | undefined): number {
  return Math.max(0, (Number(total) || 0) - (Number(baseline) || 0));
}

export type Gain = { id: string; name: string; gain: number };
export type Champion = Gain & { rank: number };

// The top `n` earners of a completed season, ranked. Zero-gain learners are
// excluded so an empty month produces no "champions".
export function rankChampions(gains: Gain[], n: number = 3): Champion[] {
  return [...gains]
    .filter((g) => g.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, Math.max(0, n))
    .map((g, i) => ({ ...g, rank: i + 1 }));
}
