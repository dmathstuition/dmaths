import { describe, it, expect } from "vitest";
import { scoreAptitude, bandFor, cleanQuestions, canLearnerStart, isAwaitingSchedule, validAptitudeQuestion, segmentsOf, segmentScores } from "@/lib/aptitude";

const QS = [
  { question: "2+2?", options: ["3", "4", "5", "6"], answer: 1 },
  { question: "Cap of Nigeria?", options: ["Lagos", "Abuja", "Kano"], answer: 1 },
  { question: "3×3?", options: ["6", "9", "12"], answer: 1 },
];

describe("scoreAptitude", () => {
  it("counts correct answers and bands the percent", () => {
    const s = scoreAptitude(QS, { "0": 1, "1": 1, "2": 0 }); // 2 of 3
    expect(s.score).toBe(2);
    expect(s.total).toBe(3);
    expect(s.percent).toBe(67);
    expect(s.band).toBe("Strong");
  });
  it("is zero with no answers", () => {
    expect(scoreAptitude(QS, {}).score).toBe(0);
    expect(scoreAptitude([], {}).percent).toBe(0);
  });
});

describe("bandFor", () => {
  it("maps percentages to bands", () => {
    expect(bandFor(90).band).toBe("Excellent");
    expect(bandFor(70).band).toBe("Strong");
    expect(bandFor(55).band).toBe("Developing");
    expect(bandFor(40).band).toBe("Emerging");
    expect(bandFor(10).band).toBe("Needs foundations");
  });
});

describe("cleanQuestions", () => {
  it("keeps only well-formed questions", () => {
    const cleaned = cleanQuestions([
      { question: "ok", options: ["a", "b"], answer: 0 },
      { question: "", options: ["a", "b"], answer: 0 },        // no text
      { question: "bad", options: ["a"], answer: 0 },           // too few options
      { question: "oob", options: ["a", "b"], answer: 5 },      // answer out of range
    ]);
    expect(cleaned).toHaveLength(1);
    expect(validAptitudeQuestion(cleaned[0])).toBe(true);
  });
});

describe("segments", () => {
  const SEG = [
    { question: "eng1", options: ["a", "b"], answer: 0, segment: "English · Comprehension" },
    { question: "sci1", options: ["a", "b"], answer: 1, segment: "Science · Forces" },
    { question: "eng2", options: ["a", "b"], answer: 0, segment: "English · Comprehension" },
  ];
  it("cleanQuestions keeps the segment label", () => {
    expect(cleanQuestions(SEG)[0].segment).toBe("English · Comprehension");
  });
  it("groups in first-appearance order, preserving original indices", () => {
    const groups = segmentsOf(SEG as any);
    expect(groups.map(g => g.segment)).toEqual(["English · Comprehension", "Science · Forces"]);
    expect(groups[0].items.map(i => i.index)).toEqual([0, 2]); // indices, not renumbered
  });
  it("scores each segment against original-index answers", () => {
    const scores = segmentScores(SEG as any, { "0": 0, "1": 0, "2": 0 }); // eng both right, sci wrong
    const eng = scores.find(s => s.segment.startsWith("English"))!;
    const sci = scores.find(s => s.segment.startsWith("Science"))!;
    expect(eng.score).toBe(2); expect(eng.total).toBe(2); expect(eng.percent).toBe(100);
    expect(sci.score).toBe(0); expect(sci.percent).toBe(0);
  });
  it("puts unlabelled questions under General", () => {
    expect(segmentsOf([{ question: "q", options: ["a", "b"], answer: 0 }] as any)[0].segment).toBe("General");
  });
});

describe("scheduling gates", () => {
  const past = new Date(Date.now() - 3600_000).toISOString();
  const future = new Date(Date.now() + 3600_000).toISOString();
  it("opens only a scheduled test whose time has arrived", () => {
    expect(canLearnerStart({ status: "scheduled", scheduled_at: past })).toBe(true);
    expect(canLearnerStart({ status: "scheduled", scheduled_at: future })).toBe(false);
    expect(canLearnerStart({ status: "scheduled", scheduled_at: null })).toBe(false);
    expect(canLearnerStart({ status: "draft", scheduled_at: past })).toBe(false);
  });
  it("flags a test awaiting a parent-chosen time", () => {
    expect(isAwaitingSchedule({ status: "scheduled", scheduled_at: null })).toBe(true);
    expect(isAwaitingSchedule({ status: "scheduled", scheduled_at: past })).toBe(false);
  });
});
