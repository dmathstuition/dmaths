import { describe, it, expect } from "vitest";
import {
  EXAM_STANDARDS, MOCK_SUBJECTS, standardByKey, mockPaperCount,
  resolveSubject, mockGroupName, MOCK_PAPER_MAX, MOCK_PAPER_MIN,
} from "@/lib/mockPaper";

describe("standardByKey", () => {
  it("returns the matching standard, or WAEC as the default", () => {
    expect(standardByKey("JAMB").key).toBe("JAMB");
    expect(standardByKey("WAEC").key).toBe("WAEC");
    expect(standardByKey("nonsense").key).toBe("WAEC");
    expect(standardByKey(null).key).toBe("WAEC");
  });
});

describe("mockPaperCount", () => {
  const jamb = standardByKey("JAMB");
  it("uses the exam default when nothing valid is given", () => {
    expect(mockPaperCount(jamb)).toBe(jamb.defaultCount);
    expect(mockPaperCount(jamb, 0)).toBe(jamb.defaultCount);
    expect(mockPaperCount(jamb, "abc" as any)).toBe(jamb.defaultCount);
  });
  it("clamps a requested count into range", () => {
    expect(mockPaperCount(jamb, 3)).toBe(MOCK_PAPER_MIN);
    expect(mockPaperCount(jamb, 999)).toBe(MOCK_PAPER_MAX);
    expect(mockPaperCount(jamb, 25)).toBe(25);
  });
});

describe("resolveSubject", () => {
  it("keeps an explicit subject", () => {
    expect(resolveSubject("Chemistry")).toBe("Chemistry");
  });
  it("picks from the pool for blank or 'random'", () => {
    expect(MOCK_SUBJECTS).toContain(resolveSubject("random", () => 0));
    expect(MOCK_SUBJECTS).toContain(resolveSubject("", () => 0.99));
    expect(resolveSubject("random", () => 0)).toBe(MOCK_SUBJECTS[0]);
  });
});

describe("mockGroupName", () => {
  it("names the saved group by exam and subject", () => {
    expect(mockGroupName("WAEC", "Mathematics")).toBe("WAEC Mock · Mathematics");
  });
  it("stays within the column limit", () => {
    expect(mockGroupName("JAMB", "x".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("EXAM_STANDARDS", () => {
  it("covers WAEC and JAMB with sane defaults", () => {
    expect(EXAM_STANDARDS.map((s) => s.key).sort()).toEqual(["JAMB", "WAEC"]);
    EXAM_STANDARDS.forEach((s) => {
      expect(s.defaultCount).toBeGreaterThanOrEqual(MOCK_PAPER_MIN);
      expect(s.defaultCount).toBeLessThanOrEqual(MOCK_PAPER_MAX);
    });
  });
});
