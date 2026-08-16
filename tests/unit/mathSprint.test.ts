import { describe, it, expect } from "vitest";
import {
  makeQuestion, makeStagedQuestion, makeStagePool, cleanSprintBatch,
  SPRINT_STAGES, MAX_STAGE,
} from "@/lib/mathSprint";

describe("makeQuestion", () => {
  it("is deterministic under a fixed RNG and the answer is correct", () => {
    expect(makeQuestion(() => 0)).toEqual({ text: "2 + 2", answer: 4 });        // op[0]=+, a=b=2
    const q = makeQuestion(() => 0.99);                                          // op[2]=×
    expect(q.text).toBe("12 × 12");
    expect(q.answer).toBe(144);
  });

  it("never produces a negative answer (subtraction is bounded)", () => {
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion();
      expect(q.answer).toBeGreaterThanOrEqual(0);
      const [a, op, b] = q.text.split(" ");
      const calc = op === "+" ? +a + +b : op === "−" ? +a - +b : +a * +b;
      expect(calc).toBe(q.answer);
    }
  });
});

describe("makeStagedQuestion", () => {
  it("every stage yields a non-negative integer answer", () => {
    for (let stage = 1; stage <= MAX_STAGE; stage++) {
      for (let i = 0; i < 300; i++) {
        const q = makeStagedQuestion(stage);
        expect(q.text.length).toBeGreaterThan(0);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("clamps an out-of-range stage into the defined range", () => {
    expect(() => makeStagedQuestion(0)).not.toThrow();
    expect(() => makeStagedQuestion(99)).not.toThrow();
    // stage 2 is pure times-tables → a single '×' expression
    const q = makeStagedQuestion(2, () => 0.5);
    expect(q.text).toContain("×");
  });

  it("scales difficulty — stage 1 stays small, stage 5 goes large", () => {
    let stage1Max = 0, stage5Max = 0;
    for (let i = 0; i < 400; i++) {
      stage1Max = Math.max(stage1Max, makeStagedQuestion(1).answer);
      stage5Max = Math.max(stage5Max, makeStagedQuestion(5).answer);
    }
    expect(stage1Max).toBeLessThan(200);
    expect(stage5Max).toBeGreaterThan(stage1Max);
  });
});

describe("makeStagePool", () => {
  it("returns the requested number of de-duplicated questions", () => {
    const pool = makeStagePool(2, 12);
    expect(pool).toHaveLength(12);
    expect(new Set(pool.map((q) => q.text)).size).toBe(12);
  });
});

describe("cleanSprintBatch", () => {
  it("keeps well-formed questions and drops bad or duplicate ones", () => {
    const out = cleanSprintBatch([
      { text: "7 + 8", answer: 15 },
      { text: "", answer: 3 },              // no text
      { text: "5 − 9", answer: -4 },        // negative answer
      { text: "6 ÷ 4", answer: 1.5 },       // non-integer
      { text: "7 + 8", answer: 15 },        // duplicate
      { text: "9 × 9", answer: 81 },
    ]);
    expect(out).toEqual([
      { text: "7 + 8", answer: 15 },
      { text: "9 × 9", answer: 81 },
    ]);
  });

  it("survives junk input", () => {
    expect(cleanSprintBatch([] as any)).toEqual([]);
    expect(cleanSprintBatch([{ answer: 3 } as any])).toEqual([]);
  });
});

describe("SPRINT_STAGES", () => {
  it("is a contiguous 1..N ladder with names and hints", () => {
    SPRINT_STAGES.forEach((s, i) => {
      expect(s.stage).toBe(i + 1);
      expect(s.name).toBeTruthy();
      expect(s.hint).toBeTruthy();
    });
    expect(MAX_STAGE).toBe(SPRINT_STAGES.length);
  });
});
