import { describe, it, expect } from "vitest";
import { rollDailyReward, DAILY_TIERS, watDay } from "@/lib/dailyReward";

describe("rollDailyReward", () => {
  it("maps the RNG to the weighted tiers", () => {
    expect(rollDailyReward(() => 0.01)).toBe(50); // jackpot band
    expect(rollDailyReward(() => 0.10)).toBe(30);
    expect(rollDailyReward(() => 0.40)).toBe(20);
    expect(rollDailyReward(() => 0.90)).toBe(10);
  });
  it("only ever returns a valid tier", () => {
    for (let i = 0; i < 200; i++) {
      expect(DAILY_TIERS).toContain(rollDailyReward() as any);
    }
  });
});

describe("watDay", () => {
  it("formats a WAT calendar day as YYYY-MM-DD", () => {
    // 2026-08-01 00:30 UTC is still 2026-08-01 in Lagos (+1)
    expect(watDay(new Date("2026-08-01T00:30:00Z"))).toBe("2026-08-01");
  });
});
