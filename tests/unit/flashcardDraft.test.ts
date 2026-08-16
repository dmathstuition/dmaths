import { describe, it, expect } from "vitest";
import { validateCard, normaliseCard, cleanCardBatch, MAX_CARD_LEN } from "@/lib/flashcardDraft";

describe("validateCard", () => {
  it("accepts a card with both sides", () => {
    expect(validateCard({ front: "2+2?", back: "4" })).toBeNull();
  });
  it("rejects a blank front", () => {
    expect(validateCard({ front: "  ", back: "4" })).toMatch(/front/i);
  });
  it("rejects a blank back", () => {
    expect(validateCard({ front: "2+2?", back: "" })).toMatch(/back/i);
  });
});

describe("normaliseCard", () => {
  it("trims both sides", () => {
    expect(normaliseCard({ front: "  a ", back: " b  " })).toEqual({ front: "a", back: "b" });
  });
  it("clamps to the column limit", () => {
    const long = "x".repeat(MAX_CARD_LEN + 50);
    const c = normaliseCard({ front: long, back: long });
    expect(c.front.length).toBe(MAX_CARD_LEN);
    expect(c.back.length).toBe(MAX_CARD_LEN);
  });
});

describe("cleanCardBatch", () => {
  it("drops malformed cards and keeps good ones", () => {
    const out = cleanCardBatch([
      { front: "Q1", back: "A1" },
      { front: "", back: "A2" },       // no front
      { front: "Q3", back: "  " },     // no back
    ]);
    expect(out).toEqual([{ front: "Q1", back: "A1" }]);
  });

  it("de-dupes by front text, case-insensitively", () => {
    const out = cleanCardBatch([
      { front: "Capital of France", back: "Paris" },
      { front: "capital of france", back: "Paris again" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].back).toBe("Paris");
  });

  it("returns an empty array for junk input", () => {
    expect(cleanCardBatch([{ front: "", back: "" }])).toEqual([]);
    expect(cleanCardBatch([] as any)).toEqual([]);
  });
});
