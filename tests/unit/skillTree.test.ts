import { describe, it, expect } from "vitest";
import { masteryTier, buildSkillMap, aggregateTopics } from "@/lib/skillTree";

describe("masteryTier", () => {
  it("tiers by attempts then accuracy", () => {
    expect(masteryTier(0, 0)).toBe("new");
    expect(masteryTier(2, 2)).toBe("learning");       // too few attempts
    expect(masteryTier(10, 9)).toBe("mastered");      // 90%
    expect(masteryTier(10, 7)).toBe("proficient");    // 70%
    expect(masteryTier(10, 4)).toBe("learning");      // 40%
  });
});

describe("buildSkillMap", () => {
  const topics = [
    { subject: "Maths", topic: "Algebra" },
    { subject: "Maths", topic: "Geometry" },
    { subject: "Physics", topic: "Motion" },
    { subject: "Maths", topic: "Algebra" }, // dup — ignored
  ];
  it("merges mastery, marks untried topics 'new', groups by subject", () => {
    const map = buildSkillMap(topics, [{ subject: "Maths", topic: "Algebra", correct: 9, total: 10 }]);
    const maths = map.find((m) => m.subject === "Maths")!;
    expect(maths.topics.length).toBe(2); // Algebra + Geometry, dup removed
    const algebra = maths.topics.find((t) => t.topic === "Algebra")!;
    expect(algebra.tier).toBe("mastered");
    expect(algebra.pct).toBe(90);
    expect(maths.topics.find((t) => t.topic === "Geometry")!.tier).toBe("new");
    expect(maths.mastered).toBe(1);
    // subjects sorted alphabetically
    expect(map.map((m) => m.subject)).toEqual(["Maths", "Physics"]);
  });
  it("is empty-safe", () => {
    expect(buildSkillMap([], [])).toEqual([]);
  });
});

describe("aggregateTopics", () => {
  it("tallies correct/total per subject+topic from graded results", () => {
    const meta = new Map([
      ["1", { subject: "Maths", topic: "Algebra" }],
      ["2", { subject: "Maths", topic: "Algebra" }],
      ["3", { subject: "Maths", topic: "Geometry" }],
    ]);
    const out = aggregateTopics([
      { id: "1", correct: true }, { id: "2", correct: false }, { id: "3", correct: true },
      { id: "x", correct: true }, // unknown id — ignored
    ], meta);
    const alg = out.find((o) => o.topic === "Algebra")!;
    expect(alg).toMatchObject({ correct: 1, total: 2 });
    expect(out.find((o) => o.topic === "Geometry")!).toMatchObject({ correct: 1, total: 1 });
  });
});
