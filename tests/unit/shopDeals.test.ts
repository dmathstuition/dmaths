import { describe, it, expect } from "vitest";
import { discountedCost, watDayNumber, dealForDay, dealExpiry, DEAL_DISCOUNT_PCT } from "@/lib/shopDeals";

const items = [
  { id: "a", cost: 100 },
  { id: "b", cost: 200 },
  { id: "c", cost: 40 },
  { id: "d", cost: 10 }, // below DEAL_MIN_COST — ineligible
];

describe("discountedCost", () => {
  it("applies the discount, rounds, and floors at 1", () => {
    expect(discountedCost(100, 25)).toBe(75);
    expect(discountedCost(40, 25)).toBe(30);
    expect(discountedCost(1, 25)).toBe(1);   // never below 1
    expect(discountedCost(100)).toBe(discountedCost(100, DEAL_DISCOUNT_PCT));
  });
});

describe("watDayNumber", () => {
  it("is stable within a WAT day and increments across days", () => {
    const d1 = watDayNumber(new Date("2026-08-15T10:00:00Z"));
    const d1b = watDayNumber(new Date("2026-08-15T22:00:00Z"));
    const d2 = watDayNumber(new Date("2026-08-16T10:00:00Z"));
    expect(d1).toBe(d1b);
    expect(d2).toBe(d1 + 1);
  });
});

describe("dealForDay", () => {
  it("is deterministic and rotates through eligible items", () => {
    const day = 3;
    expect(dealForDay(items, day)).toEqual(dealForDay(items, day)); // stable
    // eligible sorted by id: a, b, c ; d is excluded (cost 10)
    expect(dealForDay(items, 0)!.itemId).toBe("a");
    expect(dealForDay(items, 1)!.itemId).toBe("b");
    expect(dealForDay(items, 2)!.itemId).toBe("c");
    expect(dealForDay(items, 3)!.itemId).toBe("a"); // wraps
  });
  it("prices the deal at the discount", () => {
    const deal = dealForDay(items, 1)!; // item b, cost 200
    expect(deal.original).toBe(200);
    expect(deal.price).toBe(discountedCost(200));
    expect(deal.discountPct).toBe(DEAL_DISCOUNT_PCT);
  });
  it("falls back to all items when none clear the minimum, and null when empty", () => {
    expect(dealForDay([{ id: "x", cost: 5 }], 0)!.itemId).toBe("x");
    expect(dealForDay([], 0)).toBeNull();
  });
  it("handles a negative day number without crashing", () => {
    expect(dealForDay(items, -1)).not.toBeNull();
  });
});

describe("dealExpiry", () => {
  it("returns a future instant (the next WAT midnight)", () => {
    const now = new Date("2026-08-15T10:00:00Z");
    expect(new Date(dealExpiry(now)).getTime()).toBeGreaterThan(now.getTime());
  });
});
