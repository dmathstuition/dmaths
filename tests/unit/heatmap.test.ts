import { describe, it, expect } from "vitest";
import { buildHeatmap, currentStreak, levelFor } from "@/lib/heatmap";

const TODAY = new Date("2026-03-11T10:00:00Z"); // a Wednesday
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10);

describe("levelFor", () => {
  it("maps counts to intensity bands", () => {
    expect(levelFor(0)).toBe(0);
    expect(levelFor(1)).toBe(1);
    expect(levelFor(3)).toBe(2);
    expect(levelFor(5)).toBe(3);
    expect(levelFor(9)).toBe(4);
  });
});

describe("buildHeatmap", () => {
  it("returns `weeks` columns of 7 days each", () => {
    const grid = buildHeatmap([], 26, TODAY);
    expect(grid).toHaveLength(26);
    grid.forEach((col) => expect(col).toHaveLength(7));
  });

  it("counts activity on the right day and tallies duplicates", () => {
    const d = daysAgo(3);
    const grid = buildHeatmap([d, d, d], 26, TODAY);
    const cell = grid.flat().find((c) => c.date === d);
    expect(cell?.count).toBe(3);
    expect(cell?.level).toBe(2);
  });

  it("ignores junk and out-of-window dates", () => {
    const grid = buildHeatmap([null, undefined, "not-a-date", "1999-01-01"], 4, TODAY);
    expect(grid.flat().every((c) => c.count === 0)).toBe(true);
  });

  it("never marks future days as active", () => {
    const future = new Date(TODAY.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);
    const grid = buildHeatmap([future], 26, TODAY);
    expect(grid.flat().find((c) => c.date === future)?.count).toBe(0);
  });
});

describe("currentStreak", () => {
  it("counts consecutive active days ending today", () => {
    expect(currentStreak([daysAgo(0), daysAgo(1), daysAgo(2)], TODAY)).toBe(3);
  });

  it("still counts a streak that ended yesterday (today not done yet)", () => {
    expect(currentStreak([daysAgo(1), daysAgo(2)], TODAY)).toBe(2);
  });

  it("breaks on a gap", () => {
    expect(currentStreak([daysAgo(0), daysAgo(2), daysAgo(3)], TODAY)).toBe(1);
  });

  it("is 0 with no activity", () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });
});
