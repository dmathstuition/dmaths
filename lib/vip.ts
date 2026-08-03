// VIP tiers — a lifetime status ladder driven by total reward points EARNED
// (profiles.reward_points, which never drops), so a learner's tier only ever
// climbs. Each tier grants a standing shop discount. Kept pure so the shop page,
// the redeem API, and the leaderboard compute a learner's tier identically.

export type VipTier = { key: string; name: string; min: number; discountPct: number; color: string };

// Ordered low → high. `min` is the lifetime points needed; `discountPct` is the
// standing discount applied to every shop purchase at that tier.
export const VIP_TIERS: VipTier[] = [
  { key: "bronze",   name: "Bronze",   min: 0,    discountPct: 0,  color: "#B87333" },
  { key: "silver",   name: "Silver",   min: 300,  discountPct: 3,  color: "#AEB6C4" },
  { key: "gold",     name: "Gold",     min: 800,  discountPct: 6,  color: "#EFAE56" },
  { key: "platinum", name: "Platinum", min: 1800, discountPct: 9,  color: "#7BA3CA" },
  { key: "diamond",  name: "Diamond",  min: 3500, discountPct: 12, color: "#4FC3F7" },
];

// The highest tier a lifetime-points total qualifies for (never below Bronze).
export function tierFor(points: number | null | undefined): VipTier {
  const p = Math.max(0, Number(points) || 0);
  let current = VIP_TIERS[0];
  for (const t of VIP_TIERS) if (p >= t.min) current = t;
  return current;
}

// The next tier up + how many more lifetime points to reach it (null at the top).
export function nextTier(points: number | null | undefined): { next: VipTier | null; remaining: number } {
  const p = Math.max(0, Number(points) || 0);
  const next = VIP_TIERS.find((t) => t.min > p) ?? null;
  return { next, remaining: next ? next.min - p : 0 };
}

// A learner's standing shop discount from their tier.
export function tierDiscountPct(points: number | null | undefined): number {
  return tierFor(points).discountPct;
}
