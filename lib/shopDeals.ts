// Deal of the Day for the rewards shop. One active item is discounted each WAT
// calendar day, on a deterministic rotation, resetting at WAT midnight — so
// there's a fresh reason to visit and a little urgency. Kept pure so the shop
// page (which shows the deal) and the redeem API (which must charge the same
// discounted price) compute it identically; there's no schema change.

export const DEAL_DISCOUNT_PCT = 25;
// Only items at/above this cost are eligible — a discount on a trivial item
// isn't much of a "deal", and keeps the discounted price safely above zero.
export const DEAL_MIN_COST = 20;

// Discounted price, floored at 1 (reward_redemptions.cost must be > 0).
export function discountedCost(cost: number, pct = DEAL_DISCOUNT_PCT): number {
  return Math.max(1, Math.round(cost * (1 - pct / 100)));
}

// A stable integer that increments once per WAT calendar day — the rotation seed.
export function watDayNumber(date: Date = new Date()): number {
  const iso = date.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // YYYY-MM-DD
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}

// The next WAT midnight as an ISO instant — when the current deal expires
// (drives the client countdown).
export function dealExpiry(date: Date = new Date()): string {
  const iso = date.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  return new Date(Date.parse(`${iso}T00:00:00+01:00`) + 86_400_000).toISOString();
}

export type Deal = { itemId: string; original: number; price: number; discountPct: number };

// Pick the day's deal from the active catalogue. Deterministic: items are sorted
// by id (stable) and indexed by the day number, so it rotates predictably and
// every item gets its turn. Returns null when the catalogue is empty.
export function dealForDay(
  items: { id: string; cost: number }[],
  day: number,
  pct = DEAL_DISCOUNT_PCT,
): Deal | null {
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const eligible = sorted.filter((i) => i.cost >= DEAL_MIN_COST);
  const pool = eligible.length ? eligible : sorted;
  if (!pool.length) return null;
  const pick = pool[((day % pool.length) + pool.length) % pool.length];
  return { itemId: pick.id, original: pick.cost, price: discountedCost(pick.cost, pct), discountPct: pct };
}
