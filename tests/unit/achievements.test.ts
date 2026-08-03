import { describe, it, expect } from "vitest";
import { computeAchievements, unlockedCount, ACHIEVEMENTS } from "@/lib/achievements";

const base = { streak: 0, points: 0, avgScore: 0, titles: 0, referrals: 0, mocks: 0, practice: 0, cards: 0 };

describe("computeAchievements", () => {
  it("unlocks at/above the target and clamps current", () => {
    const list = computeAchievements({ ...base, points: 600, streak: 7, avgScore: 90 });
    const byId = Object.fromEntries(list.map((a) => [a.id, a]));
    expect(byId.first_points.unlocked).toBe(true);
    expect(byId.points_500.unlocked).toBe(true);
    expect(byId.points_1000.unlocked).toBe(false);
    expect(byId.streak_7.unlocked).toBe(true);
    expect(byId.ace_85.unlocked).toBe(true);
    expect(byId.points_500.current).toBe(byId.points_500.target); // clamped from 600
  });
  it("nothing unlocks from a blank slate", () => {
    expect(unlockedCount(computeAchievements(base))).toBe(0);
  });
  it("returns one entry per definition", () => {
    expect(computeAchievements(base).length).toBe(ACHIEVEMENTS.length);
  });
  it("guards junk metrics as zero", () => {
    const list = computeAchievements({ ...base, points: -50 } as any);
    expect(list.find((a) => a.id === "first_points")!.unlocked).toBe(false);
  });
});
