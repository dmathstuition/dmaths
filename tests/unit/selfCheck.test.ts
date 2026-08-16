import { describe, it, expect } from "vitest";
import { parseSelfCheck, SELF_CHECK_MAX } from "@/lib/selfCheck";

describe("parseSelfCheck", () => {
  it("keeps a valid mark and trims feedback", () => {
    expect(parseSelfCheck({ mark: 7, feedback: "  Good method.  " })).toEqual({ mark: 7, feedback: "Good method." });
  });
  it("clamps the mark into 0..max and rounds", () => {
    expect(parseSelfCheck({ mark: 99, feedback: "" }).mark).toBe(SELF_CHECK_MAX);
    expect(parseSelfCheck({ mark: -4, feedback: "" }).mark).toBe(0);
    expect(parseSelfCheck({ mark: 6.6, feedback: "" }).mark).toBe(7);
  });
  it("defaults a missing / non-numeric mark to 0", () => {
    expect(parseSelfCheck({ feedback: "x" }).mark).toBe(0);
    expect(parseSelfCheck({ mark: "abc", feedback: "x" }).mark).toBe(0);
  });
  it("handles junk input safely", () => {
    expect(parseSelfCheck(null)).toEqual({ mark: 0, feedback: "" });
  });
});
