import { describe, it, expect } from "vitest";
import { presetByKey, gradeBand, scorePercent, topicBreakdown, EXAM_PRESETS, MOCK_DAILY_BONUS } from "@/lib/mockExam";

describe("exam presets", () => {
  it("resolves a known preset and falls back to the first", () => {
    expect(presetByKey("jamb").count).toBe(40);
    expect(presetByKey("bogus").key).toBe(EXAM_PRESETS[0].key);
    expect(presetByKey(null).key).toBe(EXAM_PRESETS[0].key);
  });
  it("every preset has a positive question count and time", () => {
    for (const p of EXAM_PRESETS) {
      expect(p.count).toBeGreaterThan(0);
      expect(p.minutes).toBeGreaterThan(0);
    }
    expect(MOCK_DAILY_BONUS).toBeGreaterThan(0);
  });
});

describe("WAEC-style grade bands", () => {
  it("maps percentages to the nine-point scale", () => {
    expect(gradeBand(100).grade).toBe("A1");
    expect(gradeBand(75).grade).toBe("A1");
    expect(gradeBand(74).grade).toBe("B2");
    expect(gradeBand(60).grade).toBe("C4");
    expect(gradeBand(50).grade).toBe("C6");
    expect(gradeBand(45).grade).toBe("D7");
    expect(gradeBand(40).grade).toBe("E8");
    expect(gradeBand(39).grade).toBe("F9");
    expect(gradeBand(0).grade).toBe("F9");
  });
  it("passes at credit-and-above, fails below 40", () => {
    expect(gradeBand(50).pass).toBe(true);
    expect(gradeBand(40).pass).toBe(true);
    expect(gradeBand(39).pass).toBe(false);
  });
  it("clamps out-of-range input", () => {
    expect(gradeBand(150).grade).toBe("A1");
    expect(gradeBand(-10).grade).toBe("F9");
  });
});

describe("scorePercent", () => {
  it("rounds and guards divide-by-zero", () => {
    expect(scorePercent(1, 3)).toBe(33);
    expect(scorePercent(2, 3)).toBe(67);
    expect(scorePercent(0, 0)).toBe(0);
  });
});

describe("topicBreakdown", () => {
  it("aggregates by topic, weakest first, blanks become General", () => {
    const out = topicBreakdown([
      { topic: "Algebra", correct: true },
      { topic: "Algebra", correct: false },
      { topic: "Geometry", correct: false },
      { topic: "", correct: true },
    ]);
    expect(out[0].topic).toBe("Geometry"); // 0% — weakest first
    expect(out[0].pct).toBe(0);
    const algebra = out.find((t) => t.topic === "Algebra")!;
    expect(algebra).toMatchObject({ correct: 1, total: 2, pct: 50 });
    expect(out.some((t) => t.topic === "General")).toBe(true);
  });
});
