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

export type QuestProgress = QuestDef & { current: number; done: boolean };

// Merge today's counts onto the quest definitions. `current` is clamped to the
// target so the UI bar never overflows; `done` is the raw threshold check.
export function buildQuests(counts: Record<string, number>): QuestProgress[] {
  return QUESTS.map((q) => {
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
