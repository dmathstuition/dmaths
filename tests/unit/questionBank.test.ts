import { describe, it, expect } from "vitest";
import { validateQuestion, normaliseQuestion, pickRandom, toCbtQuestions, MAX_OPTIONS } from "@/lib/questionBank";

const GOOD = { question: "2x + 6 = 14, so x = ?", options: ["2", "4", "6", "8"], answer: 1 };

describe("validateQuestion", () => {
  it("accepts a complete question", () => {
    expect(validateQuestion(GOOD)).toBeNull();
  });

  it("rejects one with no text", () => {
    expect(validateQuestion({ ...GOOD, question: "   " })).toMatch(/text/i);
  });

  it("rejects fewer than two options", () => {
    expect(validateQuestion({ ...GOOD, options: ["4"], answer: 0 })).toMatch(/two options/i);
  });

  it("rejects a blank option rather than storing an unchoosable answer", () => {
    expect(validateQuestion({ ...GOOD, options: ["2", "", "6", "8"] })).toMatch(/blank/i);
  });

  it("rejects too many options", () => {
    const options = Array.from({ length: MAX_OPTIONS + 1 }, (_, i) => `o${i}`);
    expect(validateQuestion({ ...GOOD, options })).toMatch(/at most/i);
  });

  // The one that would silently mis-mark a learner.
  it("rejects an answer index that points at nothing", () => {
    expect(validateQuestion({ ...GOOD, answer: 4 })).toMatch(/correct answer/i);
    expect(validateQuestion({ ...GOOD, answer: -1 })).toMatch(/correct answer/i);
    expect(validateQuestion({ ...GOOD, answer: 1.5 })).toMatch(/correct answer/i);
  });
});

describe("normaliseQuestion", () => {
  it("trims text and options", () => {
    const n = normaliseQuestion({ question: "  x?  ", options: [" 2 ", " 4 "], answer: 1 });
    expect(n.question).toBe("x?");
    expect(n.options).toEqual(["2", "4"]);
  });

  it("clamps the answer inside the options it actually has", () => {
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: 9 }).answer).toBe(1);
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: -3 }).answer).toBe(0);
  });

  it("caps the option count", () => {
    const options = Array.from({ length: 20 }, (_, i) => `o${i}`);
    expect(normaliseQuestion({ question: "x?", options, answer: 0 }).options).toHaveLength(MAX_OPTIONS);
  });

  it("defaults a missing code block to empty rather than undefined", () => {
    expect(normaliseQuestion({ question: "x?", options: ["a", "b"], answer: 0 }).code).toBe("");
  });
});

describe("pickRandom", () => {
  const items = [1, 2, 3, 4, 5];

  it("never repeats a question", () => {
    const picked = pickRandom(items, 5);
    expect(new Set(picked).size).toBe(5);
  });

  it("takes everything when asked for more than exists", () => {
    expect(pickRandom(items, 99).sort()).toEqual(items);
  });

  it("handles zero and an empty pool", () => {
    expect(pickRandom(items, 0)).toEqual([]);
    expect(pickRandom([], 5)).toEqual([]);
  });

  it("is deterministic with a fixed rng", () => {
    const rng = () => 0; // always take the head
    expect(pickRandom(items, 3, rng)).toEqual([1, 2, 3]);
  });
});

describe("toCbtQuestions", () => {
  it("renumbers from 1 whatever order they were assembled in", () => {
    const out = toCbtQuestions([GOOD, { ...GOOD, question: "another" }]);
    expect(out.map((q) => q.id)).toEqual([1, 2]);
    expect(out[1].question).toBe("another");
  });

  it("keeps the answer index intact", () => {
    expect(toCbtQuestions([GOOD])[0].answer).toBe(1);
  });
});
