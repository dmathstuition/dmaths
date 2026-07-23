import { describe, it, expect } from "vitest";
import { nudgeFor, daysSince } from "@/lib/nudges";

const TODAY = new Date("2026-02-15T09:00:00Z");
const daysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

describe("daysSince", () => {
  it("counts whole days between a date and today", () => {
    expect(daysSince(daysAgo(0), TODAY)).toBe(0);
    expect(daysSince(daysAgo(1), TODAY)).toBe(1);
    expect(daysSince(daysAgo(7), TODAY)).toBe(7);
  });
});

describe("nudgeFor", () => {
  it("returns null when never active", () => {
    expect(nudgeFor(5, null, TODAY)).toBeNull();
  });

  it("nudges a streak that's about to break (active yesterday)", () => {
    const n = nudgeFor(4, daysAgo(1), TODAY);
    expect(n?.kind).toBe("streak");
    expect(n?.title).toContain("4-day");
  });

  it("does not nudge a streak of 1", () => {
    expect(nudgeFor(1, daysAgo(1), TODAY)).toBeNull();
  });

  it("does not nudge an active-today learner", () => {
    expect(nudgeFor(5, daysAgo(0), TODAY)).toBeNull();
  });

  it("sends a we-missed-you at 7 and 14 days idle", () => {
    expect(nudgeFor(0, daysAgo(7), TODAY)?.kind).toBe("inactive");
    expect(nudgeFor(0, daysAgo(14), TODAY)?.kind).toBe("inactive");
  });

  it("stays quiet on other idle days (no spam)", () => {
    expect(nudgeFor(0, daysAgo(3), TODAY)).toBeNull();
    expect(nudgeFor(0, daysAgo(10), TODAY)).toBeNull();
    expect(nudgeFor(0, daysAgo(30), TODAY)).toBeNull();
  });
});
