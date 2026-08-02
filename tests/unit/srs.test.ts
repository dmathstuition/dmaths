import { describe, it, expect } from "vitest";
import { schedule, isDue, DEFAULT_STATE, EASE_MIN, EASE_MAX, flashcardReviewPoints, FLASHCARD_DAILY_CAP } from "@/lib/srs";

const TODAY = new Date("2026-04-01T12:00:00Z");
const plus = (n: number) => new Date(TODAY.getTime() + n * 86_400_000).toISOString().slice(0, 10);

describe("schedule", () => {
  it("a new card graded 'good' comes back tomorrow", () => {
    const n = schedule(null, "good", TODAY);
    expect(n.reps).toBe(1);
    expect(n.intervalDays).toBe(1);
    expect(n.dueOn).toBe(plus(1));
  });

  it("'again' resets the card to today and lowers ease", () => {
    const n = schedule({ reps: 4, intervalDays: 20, ease: 2.5 }, "again", TODAY);
    expect(n.reps).toBe(0);
    expect(n.intervalDays).toBe(0);
    expect(n.dueOn).toBe(plus(0));
    expect(n.ease).toBeLessThan(2.5);
  });

  it("intervals grow as a card is repeatedly known", () => {
    let s = schedule(null, "good", TODAY);            // 1 day
    const first = s.intervalDays;
    s = schedule(s, "good", TODAY);                    // 3 days
    const second = s.intervalDays;
    s = schedule(s, "good", TODAY);                    // interval * ease
    expect(second).toBeGreaterThan(first);
    expect(s.intervalDays).toBeGreaterThan(second);
  });

  it("'easy' pushes further out than 'good' from the same state", () => {
    const state = { reps: 3, intervalDays: 10, ease: 2.5 };
    expect(schedule(state, "easy", TODAY).intervalDays)
      .toBeGreaterThan(schedule(state, "good", TODAY).intervalDays);
  });

  it("'hard' keeps the card close and lowers ease", () => {
    const n = schedule({ reps: 3, intervalDays: 10, ease: 2.5 }, "hard", TODAY);
    expect(n.intervalDays).toBeLessThan(Math.round(10 * 2.5));
    expect(n.ease).toBeLessThan(2.5);
  });

  it("clamps ease within bounds and caps the interval", () => {
    let s: any = { reps: 1, intervalDays: 1, ease: EASE_MIN };
    for (let i = 0; i < 5; i++) s = schedule(s, "again", TODAY);
    expect(s.ease).toBeGreaterThanOrEqual(EASE_MIN);

    let e: any = { reps: 9, intervalDays: 170, ease: EASE_MAX };
    e = schedule(e, "easy", TODAY);
    expect(e.ease).toBeLessThanOrEqual(EASE_MAX);
    expect(e.intervalDays).toBeLessThanOrEqual(180);
  });

  it("tolerates missing/garbage state by falling back to defaults", () => {
    const n = schedule({ reps: NaN as any, intervalDays: undefined, ease: 0 }, "good", TODAY);
    expect(n.reps).toBe(1);
    expect(n.ease).toBe(DEFAULT_STATE.ease);
  });
});

describe("isDue", () => {
  it("a never-reviewed card is due", () => expect(isDue(null, TODAY)).toBe(true));
  it("today and the past are due", () => {
    expect(isDue(plus(0), TODAY)).toBe(true);
    expect(isDue(plus(-3), TODAY)).toBe(true);
  });
  it("the future is not due", () => expect(isDue(plus(2), TODAY)).toBe(false));
});

describe("flashcardReviewPoints", () => {
  it("awards a point per new distinct card until the daily cap", () => {
    expect(flashcardReviewPoints(0, false)).toBe(1);
    expect(flashcardReviewPoints(FLASHCARD_DAILY_CAP - 1, false)).toBe(1);
    expect(flashcardReviewPoints(FLASHCARD_DAILY_CAP, false)).toBe(0);   // cap reached
  });
  it("earns nothing for a card already reviewed today", () => {
    expect(flashcardReviewPoints(0, true)).toBe(0);
  });
  it("honours custom cap/perReview", () => {
    expect(flashcardReviewPoints(2, false, { perReview: 3, cap: 5 })).toBe(3);
    expect(flashcardReviewPoints(5, false, { perReview: 3, cap: 5 })).toBe(0);
  });
});
