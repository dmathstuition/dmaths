import { describe, it, expect } from "vitest";
import { bossWeek, bossScorePercent, bossPassed, BOSS_DEFAULT_PASS } from "@/lib/boss";

describe("bossWeek", () => {
  it("is the same key for every day of one WAT week (Mon–Sun)", () => {
    // 2026-08-17 is a Monday. Mon..Sun should all key to that Monday.
    const days = ["2026-08-17", "2026-08-18", "2026-08-20", "2026-08-23"].map((d) => bossWeek(new Date(`${d}T09:00:00Z`)));
    expect(new Set(days).size).toBe(1);
    expect(days[0]).toBe("2026-08-17");
  });

  it("rolls to a new key the next Monday", () => {
    const thisWeek = bossWeek(new Date("2026-08-19T09:00:00Z")); // Wed
    const nextWeek = bossWeek(new Date("2026-08-24T09:00:00Z")); // following Mon
    expect(thisWeek).toBe("2026-08-17");
    expect(nextWeek).toBe("2026-08-24");
    expect(thisWeek).not.toBe(nextWeek);
  });

  it("keeps late-Sunday-WAT in the same week (not pushed by the +1h offset)", () => {
    // 22:00 UTC Sunday = 23:00 WAT Sunday, still the same week's Monday.
    expect(bossWeek(new Date("2026-08-23T22:00:00Z"))).toBe("2026-08-17");
  });
});

describe("bossScorePercent", () => {
  it("rounds to the nearest whole percent", () => {
    expect(bossScorePercent(3, 4)).toBe(75);
    expect(bossScorePercent(2, 3)).toBe(67);
    expect(bossScorePercent(0, 10)).toBe(0);
  });
  it("is 0 for an empty paper", () => {
    expect(bossScorePercent(5, 0)).toBe(0);
  });
});

describe("bossPassed", () => {
  it("passes at or above the mark, fails below", () => {
    expect(bossPassed(7, 10, 70)).toBe(true);
    expect(bossPassed(6, 10, 70)).toBe(false);
    expect(bossPassed(10, 10, 100)).toBe(true);
  });
  it("never passes a zero-question paper", () => {
    expect(bossPassed(0, 0, BOSS_DEFAULT_PASS)).toBe(false);
  });
});
