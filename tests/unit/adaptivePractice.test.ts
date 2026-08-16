import { describe, it, expect } from "vitest";
import { weakestTopics, topicAccuracy, MIN_TOPIC_ATTEMPTS, WEAK_ACCURACY } from "@/lib/adaptivePractice";

describe("topicAccuracy", () => {
  it("rounds correct/total to a percent", () => {
    expect(topicAccuracy(3, 4)).toBe(75);
    expect(topicAccuracy(0, 0)).toBe(0);
  });
});

describe("weakestTopics", () => {
  const rows = [
    { subject: "Maths", topic: "Algebra", correct: 2, total: 10 },   // 20%
    { subject: "Maths", topic: "Geometry", correct: 5, total: 10 },  // 50%
    { subject: "Maths", topic: "Trig", correct: 9, total: 10 },      // 90% — mastered
    { subject: "Maths", topic: "Stats", correct: 1, total: 2 },      // too few attempts
  ];

  it("returns under-threshold topics, weakest first", () => {
    const w = weakestTopics(rows);
    expect(w.map((t) => t.topic)).toEqual(["Algebra", "Geometry"]);
    expect(w[0].accuracy).toBe(20);
  });

  it("excludes mastered topics and those with too few attempts", () => {
    const topics = weakestTopics(rows).map((t) => t.topic);
    expect(topics).not.toContain("Trig");   // 90% ≥ threshold
    expect(topics).not.toContain("Stats");  // only 2 attempts
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ subject: "M", topic: `T${i}`, correct: 1, total: 10 }));
    expect(weakestTopics(many, { limit: 3 })).toHaveLength(3);
  });

  it("breaks ties toward more attempts", () => {
    const tie = [
      { subject: "M", topic: "Few", correct: 2, total: 10 },   // 20%, 10 attempts
      { subject: "M", topic: "Many", correct: 4, total: 20 },  // 20%, 20 attempts
    ];
    expect(weakestTopics(tie)[0].topic).toBe("Many");
  });

  it("is empty-safe and honours the constants", () => {
    expect(weakestTopics([])).toEqual([]);
    expect(MIN_TOPIC_ATTEMPTS).toBeGreaterThan(0);
    expect(WEAK_ACCURACY).toBeLessThanOrEqual(100);
  });
});
