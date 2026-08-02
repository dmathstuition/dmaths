// Avatar Studio catalog + pure helpers. Characters are free; frames are the
// cosmetic ring/glow drawn around the avatar (Tailwind `ring`/`shadow`, so they
// sit outside the circular clip and need no image assets). Premium frames cost
// reward points. Kept pure so the API and UI share one source of truth.

export type Character = { key: string; name: string; src: string };
export type Frame = { key: string; name: string; cost: number; ring: string };

// The four character mascots (paths mirror lib/avatars LEARNER_AVATARS).
export const CHARACTERS: Character[] = [
  { key: "wave",   name: "Waver",   src: "/avatars/student-wave.png" },
  { key: "laptop", name: "Coder",   src: "/avatars/student-laptop.png" },
  { key: "book",   name: "Reader",  src: "/avatars/student-book.png" },
  { key: "girl",   name: "Scholar", src: "/avatars/student-girl.png" },
];

// cost 0 = free (always owned). `ring` is the class applied to the avatar span.
export const FRAMES: Frame[] = [
  { key: "none",      name: "None",      cost: 0,   ring: "" },
  { key: "bronze",    name: "Bronze",    cost: 0,   ring: "ring-2 ring-[#B87333]" },
  { key: "silver",    name: "Silver",    cost: 30,  ring: "ring-2 ring-slate-300" },
  { key: "gold",      name: "Gold",      cost: 60,  ring: "ring-2 ring-gold shadow-[0_0_12px_-2px_rgba(239,174,86,.95)]" },
  { key: "emerald",   name: "Emerald",   cost: 90,  ring: "ring-2 ring-emerald-400 shadow-[0_0_12px_-2px_rgba(16,185,129,.85)]" },
  { key: "aurora",    name: "Aurora",    cost: 150, ring: "ring-2 ring-[#8B5CF6] shadow-[0_0_14px_-1px_rgba(139,92,246,.9)]" },
  { key: "legendary", name: "Legendary", cost: 300, ring: "ring-2 ring-gold shadow-[0_0_20px_0_rgba(239,174,86,1)]" },
];

export function frameByKey(key: string | null | undefined): Frame {
  return FRAMES.find((f) => f.key === key) ?? FRAMES[0];
}

export function characterByKey(key: string | null | undefined): Character | null {
  return CHARACTERS.find((c) => c.key === key) ?? null;
}

// The Tailwind classes for an equipped frame (empty for none/unknown).
export function frameClass(key: string | null | undefined): string {
  return frameByKey(key).ring;
}

export function isFree(key: string): boolean {
  return frameByKey(key).cost === 0;
}

// A frame is usable if it's free or the learner owns it.
export function frameOwned(key: string, owned: Iterable<string>): boolean {
  if (isFree(key)) return true;
  const set = owned instanceof Set ? owned : new Set(owned);
  return set.has(key);
}

export function canUnlock(spendable: number, cost: number): boolean {
  return cost > 0 && spendable >= cost;
}
