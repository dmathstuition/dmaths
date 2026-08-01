import { describe, it, expect } from "vitest";
import { spentPoints, spendable } from "@/lib/rewards";

const r = (cost: number, status: string) => ({ cost, status });

describe("spentPoints", () => {
  it("sums pending + fulfilled, ignores rejected", () => {
    expect(spentPoints([r(50, "pending"), r(200, "fulfilled"), r(999, "rejected")])).toBe(250);
  });
  it("is 0 for none", () => {
    expect(spentPoints([])).toBe(0);
  });
});

describe("spendable", () => {
  it("is earned minus committed points", () => {
    expect(spendable(500, [r(50, "pending"), r(200, "fulfilled")])).toBe(250);
  });
  it("never goes below zero", () => {
    expect(spendable(100, [r(200, "fulfilled")])).toBe(0);
  });
  it("rejected redemptions refund the balance", () => {
    expect(spendable(300, [r(300, "rejected")])).toBe(300);
  });
});
