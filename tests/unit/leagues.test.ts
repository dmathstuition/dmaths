import { describe, it, expect } from "vitest";
import {
  DIVISIONS, divisionFor, divisionIndex, nextDivision, progressToNext,
  leagueWeek, weeklyPoints,
} from "@/lib/leagues";

describe("divisionFor / divisionIndex", () => {
  it("places points in the highest tier they meet", () => {
    expect(divisionFor(0).name).toBe("Bronze");
    expect(divisionFor(149).name).toBe("Bronze");
    expect(divisionFor(150).name).toBe("Silver");
    expect(divisionFor(399).name).toBe("Silver");
    expect(divisionFor(400).name).toBe("Gold");
    expect(divisionFor(999999).name).toBe("Diamond");
  });
  it("treats negative / junk as Bronze", () => {
    expect(divisionFor(-50).name).toBe("Bronze");
    expect(divisionIndex(NaN)).toBe(0);
  });
});

describe("nextDivision", () => {
  it("returns the tier above, or null at the top", () => {
    expect(nextDivision(0)?.name).toBe("Silver");
    expect(nextDivision(DIVISIONS[DIVISIONS.length - 1].min)).toBeNull();
  });
});

describe("progressToNext", () => {
  it("computes remaining and percent toward the next tier", () => {
    const p = progressToNext(150); // exactly Silver start; next Gold at 400
    expect(p.current.name).toBe("Silver");
    expect(p.next?.name).toBe("Gold");
    expect(p.remaining).toBe(250);
    expect(p.pct).toBe(0);
  });
  it("is halfway when halfway through the band", () => {
    const p = progressToNext(275); // Silver 150 → Gold 400, midpoint 275
    expect(p.pct).toBe(50);
  });
  it("is full and next=null at the top division", () => {
    const p = progressToNext(9999);
    expect(p.next).toBeNull();
    expect(p.pct).toBe(100);
    expect(p.remaining).toBe(0);
  });
});

describe("leagueWeek", () => {
  it("keys every day of a WAT week to its Monday", () => {
    const mon = leagueWeek(new Date("2026-08-17T09:00:00Z"));
    const sun = leagueWeek(new Date("2026-08-23T22:00:00Z"));
    expect(mon).toBe("2026-08-17");
    expect(sun).toBe("2026-08-17");
    expect(leagueWeek(new Date("2026-08-24T09:00:00Z"))).toBe("2026-08-24");
  });
});

describe("weeklyPoints", () => {
  it("is the gain over the baseline, never negative", () => {
    expect(weeklyPoints(120, 100)).toBe(20);
    expect(weeklyPoints(90, 100)).toBe(0);
    expect(weeklyPoints(null, null)).toBe(0);
  });
});
