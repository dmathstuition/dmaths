import { describe, it, expect } from "vitest";
import { cbtBonus, gradedAssignmentBonus, streakMilestoneBonus, SUBMIT_BONUS, ONTIME_BONUS, PERFECT_BONUS } from "@/lib/earnBonuses";

describe("cbtBonus", () => {
  it("stacks completion + on-time + perfect", () => {
    expect(cbtBonus({ perfect: false, onTime: false })).toBe(SUBMIT_BONUS);
    expect(cbtBonus({ perfect: false, onTime: true })).toBe(SUBMIT_BONUS + ONTIME_BONUS);
    expect(cbtBonus({ perfect: true, onTime: true })).toBe(SUBMIT_BONUS + ONTIME_BONUS + PERFECT_BONUS);
  });
});

describe("gradedAssignmentBonus", () => {
  it("pays completion, plus perfect only at 100%", () => {
    expect(gradedAssignmentBonus(80)).toBe(SUBMIT_BONUS);
    expect(gradedAssignmentBonus(100)).toBe(SUBMIT_BONUS + PERFECT_BONUS);
  });
});

describe("streakMilestoneBonus", () => {
  it("pays only on milestone days", () => {
    expect(streakMilestoneBonus(7)).toBe(20);
    expect(streakMilestoneBonus(30)).toBe(75);
    expect(streakMilestoneBonus(8)).toBe(0);
    expect(streakMilestoneBonus(1)).toBe(0);
  });
});
