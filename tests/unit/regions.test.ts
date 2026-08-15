import { describe, it, expect } from "vitest";
import { regionByCode, levelsFor, examsFor, isKnownLevel, REGIONS, DEFAULT_REGION } from "@/lib/regions";

describe("regions", () => {
  it("has Nigeria, UK and US", () => {
    expect(REGIONS.map((r) => r.code).sort()).toEqual(["NG", "UK", "US"]);
    expect(regionByCode(DEFAULT_REGION).code).toBe("NG");
  });
  it("resolves a code and falls back to the first region", () => {
    expect(regionByCode("UK").name).toBe("United Kingdom");
    expect(regionByCode("ZZ").code).toBe("NG");
    expect(regionByCode(null).code).toBe("NG");
  });
  it("gives region-specific levels and exams", () => {
    expect(levelsFor("UK")).toContain("Year 10");
    expect(levelsFor("US")).toContain("Grade 9");
    expect(levelsFor("NG")).toContain("JSS 1");
    expect(examsFor("UK")).toContain("A-Level");
    expect(examsFor("US")).toContain("SAT");
    expect(examsFor("NG")).toContain("WAEC (WASSCE)");
  });
  it("isKnownLevel is region-scoped", () => {
    expect(isKnownLevel("UK", "Year 10")).toBe(true);
    expect(isKnownLevel("NG", "Year 10")).toBe(false);
    expect(isKnownLevel("NG", null)).toBe(false);
  });
});
