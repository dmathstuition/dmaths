import { describe, it, expect } from "vitest";
import { powerUpByKey, boostActive, boostMultiplier, resolveStreak, POWERUPS } from "@/lib/powerups";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const inMs = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe("catalog", () => {
  it("resolves known keys and rejects unknown", () => {
    expect(powerUpByKey("freeze")?.cost).toBeGreaterThan(0);
    expect(powerUpByKey("boost")?.cost).toBeGreaterThan(0);
    expect(powerUpByKey("nope")).toBeNull();
    expect(POWERUPS.length).toBeGreaterThanOrEqual(2);
  });
});

describe("boost", () => {
  it("is active only until its expiry", () => {
    expect(boostActive(inMs(60_000), NOW)).toBe(true);
    expect(boostActive(inMs(-1), NOW)).toBe(false);
    expect(boostActive(null, NOW)).toBe(false);
  });
  it("doubles while active, else 1×", () => {
    expect(boostMultiplier(inMs(60_000), NOW)).toBe(2);
    expect(boostMultiplier(null, NOW)).toBe(1);
  });
});

describe("resolveStreak", () => {
  it("starts at 1 with no history, and holds on a same-day ping", () => {
    expect(resolveStreak({ prevStreak: 0, lastDate: null, freezes: 0, today: "2026-08-15" }))
      .toMatchObject({ streak: 1, unchanged: false });
    expect(resolveStreak({ prevStreak: 5, lastDate: "2026-08-15", freezes: 0, today: "2026-08-15" }))
      .toMatchObject({ streak: 5, unchanged: true });
  });
  it("increments on a consecutive day", () => {
    expect(resolveStreak({ prevStreak: 5, lastDate: "2026-08-14", freezes: 0, today: "2026-08-15" }))
      .toMatchObject({ streak: 6, keptByFreeze: false });
  });
  it("a freeze saves a single missed day; without one it resets", () => {
    expect(resolveStreak({ prevStreak: 5, lastDate: "2026-08-13", freezes: 1, today: "2026-08-15" }))
      .toMatchObject({ streak: 6, keptByFreeze: true });
    expect(resolveStreak({ prevStreak: 5, lastDate: "2026-08-13", freezes: 0, today: "2026-08-15" }))
      .toMatchObject({ streak: 1, keptByFreeze: false });
  });
  it("a longer absence resets even with a freeze", () => {
    expect(resolveStreak({ prevStreak: 9, lastDate: "2026-08-10", freezes: 3, today: "2026-08-15" }))
      .toMatchObject({ streak: 1, keptByFreeze: false });
  });
});
