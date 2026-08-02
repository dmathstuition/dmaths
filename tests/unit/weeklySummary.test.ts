import { describe, it, expect } from "vitest";
import { inLastWeek, summariseWeek } from "@/lib/weeklySummary";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("inLastWeek", () => {
  it("accepts the last 7 days, rejects older/future/blank", () => {
    expect(inLastWeek(ago(1), NOW)).toBe(true);
    expect(inLastWeek(ago(6.9), NOW)).toBe(true);
    expect(inLastWeek(ago(8), NOW)).toBe(false);
    expect(inLastWeek(ago(-1), NOW)).toBe(false); // future
    expect(inLastWeek(null, NOW)).toBe(false);
  });
});

describe("summariseWeek", () => {
  const base = {
    now: NOW,
    practice: [{ at: ago(1), points: 6 }, { at: ago(2), points: 4 }, { at: ago(10), points: 8 }],
    mocks: [{ at: ago(1), percent: 62, band: "C4", points: 5 }, { at: ago(3), percent: 80, band: "A1", points: 0 }],
    graded: [{ at: ago(2), grade: 70 }, { at: ago(4), grade: 90 }, { at: ago(9), grade: 10 }],
    attendance: [{ at: ago(1), present: true }, { at: ago(2), present: false }, { at: ago(3), present: true }],
    behaviour: [{ at: ago(1), points: 3 }, { at: ago(2), points: -2 }, { at: ago(20), points: 5 }],
    streak: 4,
  };

  it("rolls up only the last 7 days", () => {
    const s = summariseWeek(base);
    expect(s.practiceRounds).toBe(2);            // 10d excluded
    expect(s.mocks).toBe(2);
    expect(s.bestMockPercent).toBe(80);          // best of the week
    expect(s.bestMockBand).toBe("A1");
    expect(s.assignmentsGraded).toBe(2);         // 9d excluded
    expect(s.avgGrade).toBe(80);                 // (70+90)/2
    expect(s.present).toBe(2);
    expect(s.classes).toBe(3);
    expect(s.positiveNotes).toBe(1);
    expect(s.negativeNotes).toBe(1);
    expect(s.pointsThisWeek).toBe(6 + 4 + 5 + 0 + 3); // practice + mock + positive behaviour
    expect(s.streak).toBe(4);
    expect(s.active).toBe(true);
  });

  it("is a quiet week when nothing happened", () => {
    const s = summariseWeek({ now: NOW, practice: [], mocks: [], graded: [], attendance: [], behaviour: [], streak: 0 });
    expect(s.active).toBe(false);
    expect(s.avgGrade).toBeNull();
    expect(s.bestMockPercent).toBeNull();
    expect(s.pointsThisWeek).toBe(0);
  });
});
