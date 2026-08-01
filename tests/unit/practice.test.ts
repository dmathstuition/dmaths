import { describe, it, expect } from "vitest";
import { gradeAnswers, practicePoints, PRACTICE_DAILY_CAP } from "@/lib/practice";

describe("gradeAnswers", () => {
  const key = [{ id: "a", answer: 1 }, { id: "b", answer: 0 }, { id: "c", answer: 3 }];

  it("marks each response against the key", () => {
    const g = gradeAnswers(key, [{ id: "a", chosen: 1 }, { id: "b", chosen: 2 }, { id: "c", chosen: 3 }]);
    expect(g.total).toBe(3);
    expect(g.correct).toBe(2); // a ✓, b ✗, c ✓
    expect(g.results.find((r) => r.id === "b")!.correct).toBe(false);
    expect(g.results.find((r) => r.id === "b")!.answer).toBe(0);
  });

  it("treats a missing response as wrong, never a crash", () => {
    const g = gradeAnswers(key, [{ id: "a", chosen: 1 }]); // b and c unanswered
    expect(g.correct).toBe(1);
    expect(g.results.find((r) => r.id === "c")!.chosen).toBe(-1);
  });
});

describe("practicePoints", () => {
  it("awards perCorrect for each correct answer", () => {
    expect(practicePoints(5, 0)).toBe(10); // 5 × 2
  });
  it("never exceeds what's left of the daily cap", () => {
    expect(practicePoints(10, 26)).toBe(PRACTICE_DAILY_CAP - 26); // only 4 left
    expect(practicePoints(10, PRACTICE_DAILY_CAP)).toBe(0);        // cap reached
  });
  it("clamps negatives to zero", () => {
    expect(practicePoints(-3, 0)).toBe(0);
    expect(practicePoints(3, 999)).toBe(0);
  });
});
