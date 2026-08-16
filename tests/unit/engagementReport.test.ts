import { describe, it, expect } from "vitest";
import {
  teacherAwardedFromLogs, rewardSummary, summariseMocks,
  summariseAssignments, summarisePractice, summariseAttendance,
} from "@/lib/engagementReport";

describe("teacherAwardedFromLogs", () => {
  it("sums only the positive behaviour points", () => {
    expect(teacherAwardedFromLogs([{ points: 5 }, { points: 10 }, { points: -8 }, { points: 0 }])).toBe(15);
    expect(teacherAwardedFromLogs([])).toBe(0);
  });
});

describe("rewardSummary", () => {
  it("splits the total into activity-earned and teacher-awarded", () => {
    const s = rewardSummary({ totalEarned: 120, teacherAwarded: 30, sanctions: 4, redemptions: [] });
    expect(s.totalEarned).toBe(120);
    expect(s.teacherAwarded).toBe(30);
    expect(s.activityEarned).toBe(90);
    expect(s.spendable).toBe(120);
    expect(s.sanctions).toBe(4);
  });
  it("never lets teacher-awarded exceed the total, and clamps negatives", () => {
    const s = rewardSummary({ totalEarned: 20, teacherAwarded: 50, sanctions: -3, redemptions: [] });
    expect(s.teacherAwarded).toBe(20);
    expect(s.activityEarned).toBe(0);
    expect(s.sanctions).toBe(0);
  });
  it("subtracts non-rejected redemptions from spendable only", () => {
    const s = rewardSummary({
      totalEarned: 100, teacherAwarded: 0, sanctions: 0,
      redemptions: [{ cost: 30, status: "fulfilled" }, { cost: 10, status: "rejected" }, { cost: 5, status: "pending" }],
    });
    expect(s.spendable).toBe(65);       // 100 − 30 − 5 (rejected 10 doesn't count)
    expect(s.totalEarned).toBe(100);    // earned total unaffected
  });
});

describe("summariseMocks", () => {
  it("computes count, average, best and per-paper counts", () => {
    const m = summariseMocks([
      { percent: 80, band: "A1", preset: "waec" },
      { percent: 60, band: "C4", preset: "jamb" },
      { percent: 70, band: "B3", preset: "waec" },
    ]);
    expect(m.count).toBe(3);
    expect(m.avgPercent).toBe(70);
    expect(m.bestPercent).toBe(80);
    expect(m.bestBand).toBe("A1");
    expect(m.byExam).toEqual({ waec: 2, jamb: 1, quick: 0 });
  });
  it("is empty-safe", () => {
    const m = summariseMocks([]);
    expect(m.count).toBe(0);
    expect(m.bestBand).toBe("—");
  });
});

describe("summariseAssignments", () => {
  it("counts submitted/graded and averages by type", () => {
    const a = summariseAssignments([
      { status: "graded", grade: 80, type: "cbt" },
      { status: "graded", grade: 60, type: "written" },
      { status: "submitted", grade: null, type: "written" },
      { status: "pending", grade: null, type: "cbt" },
    ]);
    expect(a.total).toBe(4);
    expect(a.submitted).toBe(3);        // 2 graded + 1 submitted
    expect(a.graded).toBe(2);
    expect(a.avgGrade).toBe(70);
    expect(a.cbt).toEqual({ graded: 1, avg: 80 });
    expect(a.written).toEqual({ graded: 1, avg: 60 });
  });
});

describe("summarisePractice", () => {
  it("totals rounds, questions and accuracy", () => {
    const p = summarisePractice([{ total: 10, correct: 7 }, { total: 5, correct: 5 }]);
    expect(p).toEqual({ rounds: 2, questions: 15, correct: 12, accuracy: 80 });
  });
  it("is empty-safe", () => {
    expect(summarisePractice([]).accuracy).toBe(0);
  });
});

describe("summariseAttendance", () => {
  it("computes the present rate", () => {
    expect(summariseAttendance([{ present: true }, { present: false }, { present: true }, { present: true }]).rate).toBe(75);
    expect(summariseAttendance([]).rate).toBe(0);
  });
});
