import { describe, it, expect } from "vitest";
import { buildQuests, allQuestsDone, questsCompleted, dailyQuests, QUESTS, QUEST_POOL, QUEST_BONUS } from "@/lib/quests";

describe("dailyQuests", () => {
  it("is deterministic per day and returns three quests from the pool", () => {
    const a = dailyQuests("2026-08-17");
    const b = dailyQuests("2026-08-17");
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    const poolIds = new Set(QUEST_POOL.map((q) => q.id));
    expect(a.every((q) => poolIds.has(q.id))).toBe(true);
  });

  it("never picks both practice variants on the same day", () => {
    for (const d of ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-09-05", "2027-02-02"]) {
      const ids = dailyQuests(d).map((q) => q.id);
      expect(ids.filter((i) => i === "practice" || i === "practice2").length).toBeLessThanOrEqual(1);
      expect(new Set(ids).size).toBe(ids.length); // no duplicates
    }
  });

  it("rotates across days", () => {
    const sets = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"].map((d) => dailyQuests(d).map((q) => q.id).join(","));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });
});

describe("buildQuests", () => {
  it("marks done at/above target and clamps current to target", () => {
    const q = buildQuests({ practice: 1, flashcards: 8, reward: 0 });
    const byId = Object.fromEntries(q.map((x) => [x.id, x]));
    expect(byId.practice.done).toBe(true);
    expect(byId.flashcards.done).toBe(true);
    expect(byId.flashcards.current).toBe(byId.flashcards.target); // clamped from 8
    expect(byId.reward.done).toBe(false);
    expect(byId.reward.current).toBe(0);
  });
  it("treats missing/negative counts as zero", () => {
    const q = buildQuests({});
    expect(q.every((x) => x.current === 0 && !x.done)).toBe(true);
    expect(buildQuests({ practice: -5 })[0].current).toBe(0);
  });
  it("returns one entry per defined quest", () => {
    expect(buildQuests({}).length).toBe(QUESTS.length);
  });
});

describe("allQuestsDone / questsCompleted", () => {
  it("all done only when every quest is met", () => {
    expect(allQuestsDone(buildQuests({ practice: 1, flashcards: 5, reward: 1 }))).toBe(true);
    expect(allQuestsDone(buildQuests({ practice: 1, flashcards: 5, reward: 0 }))).toBe(false);
    expect(allQuestsDone([])).toBe(false);
  });
  it("counts completed quests", () => {
    expect(questsCompleted(buildQuests({ practice: 1, flashcards: 4, reward: 1 }))).toBe(2);
  });
  it("has a positive bonus", () => {
    expect(QUEST_BONUS).toBeGreaterThan(0);
  });
});
