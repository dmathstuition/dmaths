import { describe, it, expect } from "vitest";
import { currentSeason, seasonLabel, seasonPoints, rankChampions } from "@/lib/seasons";

describe("currentSeason", () => {
  it("is the WAT year-month", () => {
    // 2026-08-01 00:30 UTC is still August in Lagos (+1)
    expect(currentSeason(new Date("2026-08-01T00:30:00Z"))).toBe("2026-08");
    // 2026-08-31 23:30 UTC is already September 1 in Lagos
    expect(currentSeason(new Date("2026-08-31T23:30:00Z"))).toBe("2026-09");
  });
});

describe("seasonLabel", () => {
  it("formats a human month", () => {
    expect(seasonLabel("2026-08")).toBe("August 2026");
  });
  it("falls back to the raw value when malformed", () => {
    expect(seasonLabel("nope")).toBe("nope");
  });
});

describe("seasonPoints", () => {
  it("is total minus baseline, floored at zero", () => {
    expect(seasonPoints(150, 100)).toBe(50);
    expect(seasonPoints(100, 100)).toBe(0);
    expect(seasonPoints(80, 100)).toBe(0); // never negative
    expect(seasonPoints(null, undefined)).toBe(0);
  });
});

describe("rankChampions", () => {
  const gains = [
    { id: "a", name: "Ada", gain: 40 },
    { id: "b", name: "Bola", gain: 90 },
    { id: "c", name: "Cee", gain: 0 },
    { id: "d", name: "Dan", gain: 60 },
  ];
  it("ranks the top n earners, dropping zero-gain", () => {
    const top = rankChampions(gains, 3);
    expect(top.map((g) => g.id)).toEqual(["b", "d", "a"]);
    expect(top.map((g) => g.rank)).toEqual([1, 2, 3]);
    expect(top.find((g) => g.id === "c")).toBeUndefined();
  });
  it("returns nothing for an empty/zero month", () => {
    expect(rankChampions([{ id: "x", name: "X", gain: 0 }])).toEqual([]);
  });
});
