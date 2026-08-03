import { describe, it, expect } from "vitest";
import { buildQuests, allQuestsDone, questsCompleted, QUESTS, QUEST_BONUS } from "@/lib/quests";

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
