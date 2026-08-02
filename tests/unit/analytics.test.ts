import { describe, it, expect } from "vitest";
import { pct, activityBuckets, isOnStreak, weeklyActivity } from "@/lib/analytics";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("pct", () => {
  it("rounds and guards zero", () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 5)).toBe(100);
  });
});

describe("activityBuckets", () => {
  it("buckets logins into cumulative windows; nulls are dormant", () => {
    const b = activityBuckets([ago(0.2), ago(3), ago(20), ago(45), null], NOW);
    expect(b.total).toBe(5);
    expect(b.today).toBe(1);          // 0.2d
    expect(b.week).toBe(2);           // 0.2d + 3d
    expect(b.month).toBe(3);          // + 20d
    expect(b.dormant).toBe(2);        // 45d + null
  });
  it("is empty-safe", () => {
    expect(activityBuckets([], NOW)).toEqual({ total: 0, today: 0, week: 0, month: 0, dormant: 0 });
  });
});

describe("isOnStreak", () => {
  it("true for today or yesterday, false otherwise/null", () => {
    const today = NOW.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
    const yesterday = new Date(NOW.getTime() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
    expect(isOnStreak(today, NOW)).toBe(true);
    expect(isOnStreak(yesterday, NOW)).toBe(true);
    expect(isOnStreak("2026-08-01", NOW)).toBe(false);
    expect(isOnStreak(null, NOW)).toBe(false);
  });
});

describe("weeklyActivity", () => {
  it("buckets two date lists onto the same weeks, oldest→newest", () => {
    const out = weeklyActivity([ago(1), ago(2), ago(9)], [ago(1)], 4, NOW);
    expect(out).toHaveLength(4);
    // newest bucket = this week: 2 practice (1d, 2d) + 1 mock (1d)
    expect(out[3]).toMatchObject({ practice: 2, mock: 1 });
    // 9d ago lands in the previous week
    expect(out[2].practice).toBe(1);
    // older weeks empty
    expect(out[0]).toMatchObject({ practice: 0, mock: 0 });
  });
  it("ignores dates outside the window and nulls", () => {
    const out = weeklyActivity([ago(100), null, ago(0)], [], 4, NOW);
    const totalPractice = out.reduce((a, w) => a + w.practice, 0);
    expect(totalPractice).toBe(1); // only ago(0) counts
  });
});
