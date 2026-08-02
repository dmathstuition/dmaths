import { describe, it, expect } from "vitest";
import { titleByKey, titleLabel, isFreeTitle, titleOwned, canUnlock, TITLES, CHARACTERS } from "@/lib/cosmetics";

describe("cosmetics catalog", () => {
  it("has a free default and priced premium titles", () => {
    expect(titleByKey("none").cost).toBe(0);
    expect(titleByKey("whiz").cost).toBeGreaterThan(0);
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(4);
  });
  it("falls back to 'none' for unknown keys", () => {
    expect(titleByKey("bogus").key).toBe("none");
    expect(titleLabel("bogus")).toBe("");
  });
});

describe("ownership & unlock rules", () => {
  it("free titles are always owned; premium only when in the owned set", () => {
    expect(isFreeTitle("learner")).toBe(true);
    expect(titleOwned("learner", [])).toBe(true);
    expect(titleOwned("whiz", [])).toBe(false);
    expect(titleOwned("whiz", ["whiz"])).toBe(true);
    expect(titleOwned("whiz", new Set(["whiz"]))).toBe(true);
  });
  it("canUnlock needs a positive cost and enough spendable", () => {
    const whiz = TITLES.find((t) => t.key === "whiz")!;
    expect(canUnlock(whiz.cost, whiz.cost)).toBe(true);
    expect(canUnlock(whiz.cost - 1, whiz.cost)).toBe(false);
    expect(canUnlock(999, 0)).toBe(false); // free titles aren't "unlocked"
  });
});
