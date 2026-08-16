import { describe, it, expect } from "vitest";
import { duelCount, duelOutcome, makeDuelCode, DUEL_QUESTIONS, DUEL_MIN, DUEL_MAX } from "@/lib/duel";

describe("duelCount", () => {
  it("defaults and clamps into range", () => {
    expect(duelCount()).toBe(DUEL_QUESTIONS);
    expect(duelCount(0)).toBe(DUEL_QUESTIONS);
    expect(duelCount(1)).toBe(DUEL_MIN);
    expect(duelCount(100)).toBe(DUEL_MAX);
    expect(duelCount(5)).toBe(5);
  });
});

describe("duelOutcome", () => {
  it("names the winner or a draw", () => {
    expect(duelOutcome(4, 2)).toBe("creator");
    expect(duelOutcome(1, 3)).toBe("opponent");
    expect(duelOutcome(3, 3)).toBe("draw");
  });
});

describe("makeDuelCode", () => {
  it("makes a fixed-length code from unambiguous characters", () => {
    const code = makeDuelCode(() => 0);
    expect(code).toHaveLength(5);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/); // no I, O, 0, 1
  });
  it("respects a custom length and varies with the rng", () => {
    expect(makeDuelCode(() => 0.5, 6)).toHaveLength(6);
    expect(makeDuelCode(() => 0)).not.toBe(makeDuelCode(() => 0.99));
  });
});
