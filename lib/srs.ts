// Spaced-repetition scheduler (SM-2, simplified for school revision).
// Pure + deterministic so it can be unit-tested: given a card's current state
// and how well the learner recalled it, return the next state and due date.

export type Grade = "again" | "hard" | "good" | "easy";

export type SrsState = {
  reps: number;          // successful reviews in a row
  intervalDays: number;  // gap until the next review
  ease: number;          // difficulty multiplier (higher = easier card)
};

export type SrsNext = SrsState & { dueOn: string };

export const EASE_MIN = 1.3;
export const EASE_MAX = 2.8;
export const DEFAULT_STATE: SrsState = { reps: 0, intervalDays: 0, ease: 2.5 };

const clampEase = (e: number) => Math.min(EASE_MAX, Math.max(EASE_MIN, Number(e.toFixed(2))));

function addDays(from: Date, days: number): string {
  const base = new Date(`${from.toISOString().slice(0, 10)}T00:00:00Z`);
  return new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

// "again" resets the card to be seen again today; the rest push it further out.
export function schedule(state: Partial<SrsState> | null | undefined, grade: Grade, today: Date = new Date()): SrsNext {
  const cur: SrsState = {
    reps: Math.max(0, Number(state?.reps ?? DEFAULT_STATE.reps) || 0),
    intervalDays: Math.max(0, Number(state?.intervalDays ?? DEFAULT_STATE.intervalDays) || 0),
    ease: clampEase(Number(state?.ease ?? DEFAULT_STATE.ease) || DEFAULT_STATE.ease),
  };

  let { reps, intervalDays, ease } = cur;

  switch (grade) {
    case "again":
      reps = 0;
      intervalDays = 0;               // back in today's pile
      ease = clampEase(ease - 0.2);
      break;
    case "hard":
      reps += 1;
      intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2));
      ease = clampEase(ease - 0.15);
      break;
    case "good":
      reps += 1;
      intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(1, Math.round(intervalDays * ease));
      break;
    case "easy":
      reps += 1;
      ease = clampEase(ease + 0.15);
      intervalDays = reps === 1 ? 2 : Math.max(2, Math.round((intervalDays || 1) * ease * 1.3));
      break;
  }

  // Keep intervals sane for a school term.
  intervalDays = Math.min(intervalDays, 180);

  return { reps, intervalDays, ease, dueOn: addDays(today, intervalDays) };
}

// A card is due when it has never been reviewed, or its due date has arrived.
export function isDue(dueOn: string | null | undefined, today: Date = new Date()): boolean {
  if (!dueOn) return true;
  return String(dueOn).slice(0, 10) <= today.toISOString().slice(0, 10);
}

// Reward for keeping up revision: a point per distinct card reviewed each day,
// capped so it can't be farmed by re-grading the same pile. Re-reviewing a card
// already done today earns nothing (it isn't a new distinct card).
export const FLASHCARD_PER_REVIEW = 1;
export const FLASHCARD_DAILY_CAP = 10;

export function flashcardReviewPoints(
  distinctReviewedToday: number,
  alreadyReviewedToday: boolean,
  { perReview = FLASHCARD_PER_REVIEW, cap = FLASHCARD_DAILY_CAP }: { perReview?: number; cap?: number } = {},
): number {
  if (alreadyReviewedToday) return 0;
  return Math.max(0, distinctReviewedToday) < cap ? perReview : 0;
}
