import { CHARACTERS, type Character } from "@/lib/avatars";

// Characters live in lib/avatars (the single source of truth) — re-exported here
// so the Studio UI + API keep one import.
export { CHARACTERS };
export type { Character };

// Buyable cosmetic: a name TITLE (flair) shown next to the learner's name across
// the portal. Titles carry a RARITY, which powers both the direct price and the
// Mystery Crate (a loot box that rolls a random unowned title, weighted by
// rarity). Kept pure so the API and UI share one source of truth.
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Title = { key: string; label: string; cost: number; rarity: Rarity };

// Rarity metadata — roll weight (higher = more common) + colours matching the
// shop's loot tiers. legendary is deliberately rare, so pulling one is a moment.
export const RARITY: Record<Rarity, { label: string; weight: number; color: string; glow: string }> = {
  common:    { label: "Common",    weight: 60, color: "#10B981", glow: "rgba(16,185,129,.6)" },
  rare:      { label: "Rare",      weight: 28, color: "#3B82F6", glow: "rgba(59,130,246,.7)" },
  epic:      { label: "Epic",      weight: 10, color: "#8B5CF6", glow: "rgba(139,92,246,.75)" },
  legendary: { label: "Legendary", weight: 2,  color: "#EFAE56", glow: "rgba(239,174,86,.85)" },
};

// What one Mystery Crate costs to open.
export const CRATE_COST = 70;

// cost 0 = free (always owned). label "" (the 'none' key) shows no title.
export const TITLES: Title[] = [
  { key: "none",     label: "",                cost: 0,   rarity: "common" },
  { key: "learner",  label: "Learner",         cost: 0,   rarity: "common" },
  // ── Common ──
  { key: "rising",   label: "Rising Star",     cost: 40,  rarity: "common" },
  { key: "spark",    label: "Bright Spark",    cost: 80,  rarity: "common" },
  { key: "eager",    label: "Eager Beaver",    cost: 60,  rarity: "common" },
  { key: "curious",  label: "Curious Mind",    cost: 80,  rarity: "common" },
  // ── Rare ──
  { key: "whiz",     label: "Math Whiz",       cost: 120, rarity: "rare" },
  { key: "ace",      label: "Quiz Ace",        cost: 120, rarity: "rare" },
  { key: "sharp",    label: "Sharp Shooter",   cost: 140, rarity: "rare" },
  { key: "swift",    label: "Swift Solver",    cost: 160, rarity: "rare" },
  // ── Epic ──
  { key: "brain",    label: "Brainiac",        cost: 200, rarity: "epic" },
  { key: "sage",     label: "Number Sage",     cost: 240, rarity: "epic" },
  { key: "maestro",  label: "Maths Maestro",   cost: 260, rarity: "epic" },
  // ── Legendary ──
  { key: "legend",   label: "Legend",          cost: 350, rarity: "legendary" },
  { key: "prodigy",  label: "Prodigy",         cost: 400, rarity: "legendary" },
  { key: "einstein", label: "Little Einstein", cost: 450, rarity: "legendary" },
  { key: "goat",     label: "The G.O.A.T",     cost: 500, rarity: "legendary" },
];

export function titleByKey(key: string | null | undefined): Title {
  return TITLES.find((t) => t.key === key) ?? TITLES[0];
}

// The label to show for an equipped title ("" = show nothing).
export function titleLabel(key: string | null | undefined): string {
  return titleByKey(key).label;
}

export function characterByKey(key: string | null | undefined): Character | null {
  return CHARACTERS.find((c) => c.key === key) ?? null;
}

export function isFreeTitle(key: string): boolean {
  return titleByKey(key).cost === 0;
}

// A title is usable if it's free or the learner owns it.
export function titleOwned(key: string, owned: Iterable<string>): boolean {
  if (isFreeTitle(key)) return true;
  const set = owned instanceof Set ? owned : new Set(owned);
  return set.has(key);
}

export function canUnlock(spendable: number, cost: number): boolean {
  return cost > 0 && spendable >= cost;
}

// A title can be gifted to a friend if it's a real, priced title (free ones
// need no gifting, and unknown keys can't be bought).
export function isGiftableTitle(key: string): boolean {
  const t = titleByKey(key);
  return t.key === key && t.cost > 0;
}

// The pool a Mystery Crate can roll from: every priced title not yet owned.
export function cratePool(owned: Iterable<string>): Title[] {
  const set = owned instanceof Set ? owned : new Set(owned);
  return TITLES.filter((t) => t.cost > 0 && !set.has(t.key));
}

// Roll one title from the crate: pick a rarity by weight (only among rarities
// that still have something unowned), then a uniform pick within it. Returns
// null when the learner already owns every title. Deterministic given `rng`,
// which draws in [0,1) — the API passes Math.random, tests pass a fake.
export function rollCrate(owned: Iterable<string>, rng: () => number = Math.random): Title | null {
  const pool = cratePool(owned);
  if (!pool.length) return null;

  const byRarity = new Map<Rarity, Title[]>();
  for (const t of pool) {
    const bucket = byRarity.get(t.rarity);
    if (bucket) bucket.push(t); else byRarity.set(t.rarity, [t]);
  }
  const rarities = [...byRarity.keys()];
  const totalWeight = rarities.reduce((a, r) => a + RARITY[r].weight, 0);

  let roll = rng() * totalWeight;
  let chosen: Rarity = rarities[0];
  for (const r of rarities) {
    roll -= RARITY[r].weight;
    if (roll < 0) { chosen = r; break; }
  }
  const bucket = byRarity.get(chosen)!;
  return bucket[Math.min(bucket.length - 1, Math.floor(rng() * bucket.length))];
}
