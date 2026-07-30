import { describe, it, expect } from "vitest";
import { pctChange, countTrend, sumTrend } from "@/lib/trends";

const NOW = new Date("2026-07-15T12:00:00Z"); // July 2026

describe("pctChange", () => {
  it("computes a rounded percentage change", () => {
    expect(pctChange(112, 100)).toBe(12);
    expect(pctChange(90, 100)).toBe(-10);
    expect(pctChange(100, 100)).toBe(0);
  });
  it("returns null when there is no baseline", () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });
});

describe("countTrend", () => {
  it("compares this month's count to last month's", () => {
    const dates = [
      "2026-07-01", "2026-07-10", "2026-07-14", // 3 this month
      "2026-06-05", "2026-06-20",               // 2 last month
      "2026-05-01",                             // older, ignored
    ];
    expect(countTrend(dates, NOW)).toBe(50); // (3-2)/2
  });
  it("ignores blank / unparseable dates and returns null with no baseline", () => {
    expect(countTrend(["2026-07-02", null, "nope", undefined], NOW)).toBeNull(); // prev = 0
  });
});

describe("sumTrend", () => {
  it("compares this month's total to last month's", () => {
    const rows = [
      { date: "2026-07-03", amount: 30000 },
      { date: "2026-07-19", amount: 30000 }, // 60k this month
      { date: "2026-06-11", amount: 50000 }, // 50k last month
    ];
    expect(sumTrend(rows, NOW)).toBe(20); // (60k-50k)/50k
  });
  it("coerces amounts and skips undated rows", () => {
    const rows = [
      { date: "2026-07-01", amount: "10000" as any },
      { date: null, amount: 999 },
      { date: "2026-06-01", amount: 10000 },
    ];
    expect(sumTrend(rows, NOW)).toBe(0);
  });
});
