import { describe, it, expect } from "vitest";
import { happyHourActive, HAPPY_HOUR_MULT, HAPPY_HOUR_KEY } from "@/lib/happyHour";

describe("happyHourActive", () => {
  const now = new Date("2026-08-15T12:00:00Z");

  it("is active while the window is still in the future", () => {
    expect(happyHourActive("2026-08-15T12:30:00Z", now)).toBe(true);
  });

  it("is inactive once the window has passed", () => {
    expect(happyHourActive("2026-08-15T11:30:00Z", now)).toBe(false);
  });

  it("is inactive exactly at expiry (strictly greater than now)", () => {
    expect(happyHourActive("2026-08-15T12:00:00Z", now)).toBe(false);
  });

  it("is inactive for null / undefined / empty", () => {
    expect(happyHourActive(null, now)).toBe(false);
    expect(happyHourActive(undefined, now)).toBe(false);
    expect(happyHourActive("", now)).toBe(false);
  });

  it("exposes a 2× multiplier and a stable settings key", () => {
    expect(HAPPY_HOUR_MULT).toBe(2);
    expect(HAPPY_HOUR_KEY).toBe("happy_hour_until");
  });
});
