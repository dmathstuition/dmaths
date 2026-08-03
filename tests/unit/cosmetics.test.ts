import { describe, it, expect } from "vitest";
import { titleByKey, titleLabel, isFreeTitle, titleOwned, canUnlock, TITLES, CHARACTERS, cratePool, rollCrate, RARITY } from "@/lib/cosmetics";

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

describe("mystery crate", () => {
  const pricedKeys = TITLES.filter((t) => t.cost > 0).map((t) => t.key);

  it("every priced title has a valid rarity", () => {
    for (const t of TITLES.filter((t) => t.cost > 0)) {
      expect(RARITY[t.rarity]).toBeDefined();
    }
  });
  it("cratePool excludes free and owned titles", () => {
    const pool = cratePool(["whiz"]);
    expect(pool.some((t) => t.key === "whiz")).toBe(false);     // owned
    expect(pool.some((t) => t.cost === 0)).toBe(false);         // free
    expect(pool.length).toBe(pricedKeys.length - 1);
  });
  it("rolls an unowned title and returns null once all are collected", () => {
    const rolled = rollCrate([], () => 0);        // deterministic first pick
    expect(rolled).not.toBeNull();
    expect(rolled!.cost).toBeGreaterThan(0);
    expect(rollCrate(pricedKeys)).toBeNull();      // owns everything
  });
  it("never rolls a title the learner already owns", () => {
    // Own all but one; the roll must be that remaining title.
    const allButGoat = pricedKeys.filter((k) => k !== "goat");
    const rolled = rollCrate(allButGoat, () => 0.999);
    expect(rolled!.key).toBe("goat");
  });
});
