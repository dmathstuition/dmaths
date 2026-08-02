import { CHARACTERS, type Character } from "@/lib/avatars";

// Characters live in lib/avatars (the single source of truth) — re-exported here
// so the Studio UI + API keep one import.
export { CHARACTERS };
export type { Character };

// Buyable cosmetic: a name TITLE (flair) shown next to the learner's name across
// the portal. Free ones are always available; premium titles cost reward points.
// Kept pure so the API and UI share one source of truth.
export type Title = { key: string; label: string; cost: number };

// cost 0 = free (always owned). label "" (the 'none' key) shows no title.
export const TITLES: Title[] = [
  { key: "none",    label: "",             cost: 0 },
  { key: "learner", label: "Learner",      cost: 0 },
  { key: "rising",  label: "Rising Star",  cost: 40 },
  { key: "spark",   label: "Bright Spark", cost: 80 },
  { key: "whiz",    label: "Math Whiz",    cost: 120 },
  { key: "brain",   label: "Brainiac",     cost: 200 },
  { key: "legend",  label: "Legend",       cost: 350 },
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
