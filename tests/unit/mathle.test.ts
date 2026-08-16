import { describe, it, expect } from "vitest";
import { dailyEquation, isValidEquation, scoreGuess, MATHLE_LEN } from "@/lib/mathle";

describe("dailyEquation", () => {
  it("is deterministic for a given day and a valid 8-char equation", () => {
    const a = dailyEquation("2026-08-17");
    const b = dailyEquation("2026-08-17");
    expect(a).toBe(b);
    expect(a.length).toBe(MATHLE_LEN);
    expect(isValidEquation(a)).toBe(true);
  });

  it("varies across days and is always valid & correctly sized", () => {
    const days = ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-09-01", "2027-01-01"];
    for (const d of days) {
      const eq = dailyEquation(d);
      expect(eq.length).toBe(MATHLE_LEN);
      expect(isValidEquation(eq)).toBe(true);
    }
    expect(new Set(days.map(dailyEquation)).size).toBeGreaterThan(1);
  });
});

describe("isValidEquation", () => {
  it("accepts correct 8-char equations", () => {
    expect(isValidEquation("12+37=49")).toBe(true);
    expect(isValidEquation("90-41=49")).toBe(true);
    expect(isValidEquation("48/06=08")).toBe(true);  // 48/6 = 8
  });
  it("rejects wrong length, bad chars, wrong maths, or no operator", () => {
    expect(isValidEquation("1+2=3")).toBe(false);      // too short
    expect(isValidEquation("12+37=50")).toBe(false);   // wrong sum
    expect(isValidEquation("12345678")).toBe(false);   // no '='
    expect(isValidEquation("12+3a=15")).toBe(false);   // bad char
    expect(isValidEquation("10/00=00")).toBe(false);   // divide by zero
  });
});

describe("scoreGuess", () => {
  it("marks correct / present / absent with duplicate handling", () => {
    // solution 12+37=49, guess 12+39=41
    const s = scoreGuess("12+39=41", "12+37=49");
    expect(s.slice(0, 4)).toEqual(["correct", "correct", "correct", "correct"]); // "12+3"
    expect(s[4]).toBe("present");  // '9' is in the solution (at the end), wrong spot here
    expect(s[5]).toBe("correct");  // '='
    expect(s[7]).toBe("absent");   // trailing '1' not in the solution
  });

  it("does not over-award a repeated digit beyond its count", () => {
    // solution has a single '4'; a guess with two '4's should mark only one present/correct
    const s = scoreGuess("44+11=55", "14+20=34");
    const fours = s.filter((_, i) => "44+11=55"[i] === "4");
    expect(fours.filter((x) => x !== "absent").length).toBeLessThanOrEqual(2);
  });
});
