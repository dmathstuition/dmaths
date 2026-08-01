import { describe, it, expect } from "vitest";
import { makeQuestion } from "@/lib/mathSprint";

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
      // the printed answer matches the printed expression
      const [a, op, b] = q.text.split(" ");
      const calc = op === "+" ? +a + +b : op === "−" ? +a - +b : +a * +b;
      expect(calc).toBe(q.answer);
    }
  });
});
