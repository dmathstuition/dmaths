// Daily Quests — three small self-serve goals that reset each WAT day, with a
// bonus for clearing all three. Kept pure so the progress/all-done logic is
// unit-testable; the API computes today's counts from existing tables and the
// dashboard renders the result.

export const QUEST_BONUS = 15; // reward points for clearing all three today

export type QuestDef = { id: string; label: string; target: number; icon: string; href: string };

// Each quest maps to an activity signal the learner can complete today on their
// own — no admin action needed. `id` matches the count key the API supplies.
export const QUESTS: QuestDef[] = [
  { id: "practice",   label: "Sit a practice round",    target: 1, icon: "target", href: "/portal/practice" },
  { id: "flashcards", label: "Review 5 revision cards", target: 5, icon: "book",   href: "/portal/flashcards" },
  { id: "reward",     label: "Open your daily reward",  target: 1, icon: "gift",   href: "/portal" },
];

// A wider pool the daily board draws from, so the three quests rotate day to day
// rather than always being the same. Every id here is counted by /api/quests.
export const QUEST_POOL: QuestDef[] = [
  ...QUESTS,
  { id: "mock",       label: "Finish a mock exam",      target: 1, icon: "graduationCap", href: "/portal/mock-exam" },
  { id: "practice2",  label: "Sit two practice rounds", target: 2, icon: "target",        href: "/portal/practice" },
];

// Tiny deterministic RNG from a string seed, so a given day always yields the
// same board for everyone.
function seeded(seed: string): () => number {
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The three quests for a given WAT day — a deterministic pick from the pool.
// "practice" and "practice2" share a count source, so never both appear.
export function dailyQuests(dayKey: string, size = 3): QuestDef[] {
  const rng = seeded(`quests:${dayKey}`);
  const pool = [...QUEST_POOL].sort(() => rng() - 0.5);
  const chosen: QuestDef[] = [];
  const usedPractice = new Set(["practice", "practice2"]);
  let tookPractice = false;
  for (const q of pool) {
    if (chosen.length >= size) break;
    if (usedPractice.has(q.id)) { if (tookPractice) continue; tookPractice = true; }
    chosen.push(q);
  }
  return chosen;
}

export type QuestProgress = QuestDef & { current: number; done: boolean };

// Merge today's counts onto the quest definitions. `current` is clamped to the
// target so the UI bar never overflows; `done` is the raw threshold check.
export function buildQuests(counts: Record<string, number>, quests: QuestDef[] = QUESTS): QuestProgress[] {
  return quests.map((q) => {
    const raw = Math.max(0, Math.floor(counts[q.id] ?? 0));
    return { ...q, current: Math.min(raw, q.target), done: raw >= q.target };
  });
}

export function allQuestsDone(progress: QuestProgress[]): boolean {
  return progress.length > 0 && progress.every((q) => q.done);
}

export function questsCompleted(progress: QuestProgress[]): number {
  return progress.filter((q) => q.done).length;
}
