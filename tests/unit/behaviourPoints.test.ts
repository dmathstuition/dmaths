import { describe, it, expect } from "vitest";
import { sanctionFromPoints, rewardDeltaForLog, nextRewardTotal } from "@/lib/behaviourPoints";

describe("sanctionFromPoints", () => {
  it("sums only the non-positive points", () => {
    expect(sanctionFromPoints([5, -3, 10, -2, 0])).toBe(-5);
    expect(sanctionFromPoints([])).toBe(0);
    expect(sanctionFromPoints([1, 2, 3])).toBe(0);
  });
});

describe("rewardDeltaForLog", () => {
  it("adds only for positive behaviour, never subtracts", () => {
    expect(rewardDeltaForLog(10)).toBe(10);
    expect(rewardDeltaForLog(-10)).toBe(0);
    expect(rewardDeltaForLog(0)).toBe(0);
  });
});

describe("nextRewardTotal", () => {
  it("adjusts the running total by the delta without dropping earned bonuses", () => {
    // 200 earned from bonuses; a +10 behaviour must give 210, not overwrite to 10.
    expect(nextRewardTotal(200, 10)).toBe(210);
    // deleting a +10 behaviour later removes exactly 10.
    expect(nextRewardTotal(210, -10)).toBe(200);
  });
  it("never goes below zero", () => {
    expect(nextRewardTotal(5, -50)).toBe(0);
  });
});
