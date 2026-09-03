import { describe, it, expect } from "vitest";
import { PRICING_TIERS, ratePerHour, usdFromNgn, fmtUsd, fmtNgn, findTier } from "@/lib/pricing";

describe("pricing tiers", () => {
  it("has the three published hourly rates", () => {
    expect(ratePerHour("standard")).toBe(18000);
    expect(ratePerHour("ks2")).toBe(20000);
    expect(ratePerHour("coding")).toBe(25000);
  });
  it("falls back to the core-subjects rate for an unknown/empty tier", () => {
    expect(ratePerHour(undefined)).toBe(18000);
    expect(ratePerHour("nope")).toBe(18000);
  });
  it("every tier has a positive rate and at least one 'covers' chip", () => {
    for (const t of PRICING_TIERS) {
      expect(t.ngnPerHour).toBeGreaterThan(0);
      expect(t.covers.length).toBeGreaterThan(0);
    }
  });
  it("findTier returns undefined for a missing id", () => {
    expect(findTier(null)).toBeUndefined();
    expect(findTier("ks2")?.name).toBe("KS2 exam prep");
  });
});

describe("currency helpers", () => {
  it("converts naira to USD at ₦1,500/$1", () => {
    expect(usdFromNgn(18000)).toBe(12);
    expect(usdFromNgn(20000)).toBeCloseTo(13.33, 2);
    expect(usdFromNgn(25000)).toBeCloseTo(16.67, 2);
  });
  it("formats currencies", () => {
    expect(fmtNgn(18000)).toBe("₦18,000");
    expect(fmtUsd(12)).toBe("$12.00");
  });
});
