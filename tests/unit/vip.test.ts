import { describe, it, expect } from "vitest";
import { tierFor, nextTier, tierDiscountPct, VIP_TIERS } from "@/lib/vip";

describe("tierFor", () => {
  it("returns the highest tier a total qualifies for", () => {
    expect(tierFor(0).key).toBe("bronze");
    expect(tierFor(299).key).toBe("bronze");
    expect(tierFor(300).key).toBe("silver");
    expect(tierFor(800).key).toBe("gold");
    expect(tierFor(5000).key).toBe("diamond");
  });
  it("never drops below bronze, guards junk input", () => {
    expect(tierFor(-100).key).toBe("bronze");
    expect(tierFor(null).key).toBe("bronze");
    expect(tierFor(undefined).key).toBe("bronze");
  });
});

describe("nextTier", () => {
  it("gives the next tier and points remaining", () => {
    expect(nextTier(0)).toEqual({ next: VIP_TIERS[1], remaining: 300 });
    expect(nextTier(250).remaining).toBe(50);
  });
  it("is null at the top tier", () => {
    expect(nextTier(9999)).toEqual({ next: null, remaining: 0 });
  });
});

describe("tierDiscountPct", () => {
  it("tracks the tier's standing discount and is monotonic", () => {
    expect(tierDiscountPct(0)).toBe(0);
    expect(tierDiscountPct(300)).toBe(3);
    expect(tierDiscountPct(3500)).toBe(12);
    // discounts never decrease as tiers rise
    const pcts = VIP_TIERS.map((t) => t.discountPct);
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThanOrEqual(pcts[i - 1]);
  });
});
