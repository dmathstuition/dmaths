import { describe, it, expect } from "vitest";
import { frameByKey, frameClass, isFree, frameOwned, canUnlock, FRAMES, CHARACTERS } from "@/lib/cosmetics";

describe("cosmetics catalog", () => {
  it("has a free 'none' default and priced premium frames", () => {
    expect(frameByKey("none").cost).toBe(0);
    expect(frameByKey("gold").cost).toBeGreaterThan(0);
    expect(CHARACTERS.length).toBeGreaterThanOrEqual(4);
  });
  it("falls back to 'none' for unknown keys", () => {
    expect(frameByKey("bogus").key).toBe("none");
    expect(frameClass("bogus")).toBe("");
  });
});

describe("ownership & unlock rules", () => {
  it("free frames are always owned; premium only when in the owned set", () => {
    expect(isFree("bronze")).toBe(true);
    expect(frameOwned("bronze", [])).toBe(true);
    expect(frameOwned("gold", [])).toBe(false);
    expect(frameOwned("gold", ["gold"])).toBe(true);
    expect(frameOwned("gold", new Set(["gold"]))).toBe(true);
  });
  it("canUnlock needs a positive cost and enough spendable", () => {
    const gold = FRAMES.find((f) => f.key === "gold")!;
    expect(canUnlock(gold.cost, gold.cost)).toBe(true);
    expect(canUnlock(gold.cost - 1, gold.cost)).toBe(false);
    expect(canUnlock(999, 0)).toBe(false); // free frames aren't "unlocked"
  });
});
