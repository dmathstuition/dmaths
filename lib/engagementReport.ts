// Pure aggregations for a learner's engagement report — reward economy, mocks,
// tests/assignments, practice and attendance rolled into report-ready numbers.
// Kept I/O-free so every summary is unit-testable; the page reads the rows with
// the service role and feeds them in.
import { gradeBand } from "@/lib/mockExam";
import { spendable, type RedemptionLike } from "@/lib/rewards";

// ── Reward economy ──────────────────────────────────────────────
export type RewardSummary = {
  totalEarned: number;      // lifetime reward_points (the leaderboard figure)
  teacherAwarded: number;   // of that, points a teacher gave for good conduct
  activityEarned: number;   // the rest — earned through practice, mocks, streaks…
  spendable: number;        // still available after redemptions
  sanctions: number;        // conduct deductions (never subtracted from earned)
};

// Teacher-awarded points = the positive behaviour-log entries. Negative ones are
// sanctions, tracked separately, and never reduce what was earned.
export function teacherAwardedFromLogs(logs: { points: number | null }[]): number {
  return (logs ?? []).reduce((a, l) => a + (Number(l?.points) > 0 ? Number(l.points) : 0), 0);
}

export function rewardSummary(input: {
  totalEarned: number; teacherAwarded: number; sanctions: number; redemptions: RedemptionLike[];
}): RewardSummary {
  const totalEarned = Math.max(0, Math.round(Number(input.totalEarned) || 0));
  const teacherAwarded = Math.max(0, Math.min(totalEarned, Math.round(Number(input.teacherAwarded) || 0)));
  return {
    totalEarned,
    teacherAwarded,
    activityEarned: Math.max(0, totalEarned - teacherAwarded),
    spendable: spendable(totalEarned, input.redemptions ?? []),
    sanctions: Math.max(0, Math.round(Number(input.sanctions) || 0)),
  };
}

// ── Mocks ───────────────────────────────────────────────────────
export type MockRow = { percent: number; band: string; preset: string; subject?: string; created_at?: string };
export type MockSummary = {
  count: number; avgPercent: number; bestPercent: number; bestBand: string;
  byExam: { waec: number; jamb: number; quick: number };
};

export function summariseMocks(rows: MockRow[]): MockSummary {
  const list = rows ?? [];
  const count = list.length;
  const avgPercent = count ? Math.round(list.reduce((a, r) => a + (Number(r.percent) || 0), 0) / count) : 0;
  const bestPercent = list.reduce((m, r) => Math.max(m, Number(r.percent) || 0), 0);
  const best = list.find((r) => (Number(r.percent) || 0) === bestPercent);
  const bestBand = count ? (best?.band || gradeBand(bestPercent).grade) : "—";
  return {
    count, avgPercent, bestPercent, bestBand,
    byExam: {
      waec: list.filter((r) => r.preset === "waec").length,
      jamb: list.filter((r) => r.preset === "jamb").length,
      quick: list.filter((r) => r.preset === "quick").length,
    },
  };
}

// ── Tests & assignments (written + CBT) ─────────────────────────
export type SubmissionRow = { status: string; grade: number | null; type: "written" | "cbt" | string };
export type AssignmentSplit = { graded: number; avg: number };
export type AssignmentSummary = {
  total: number; submitted: number; graded: number; avgGrade: number;
  cbt: AssignmentSplit; written: AssignmentSplit;
};

export function summariseAssignments(rows: SubmissionRow[]): AssignmentSummary {
  const list = rows ?? [];
  const submitted = list.filter((r) => r.status === "submitted" || r.status === "graded").length;
  const gradedRows = list.filter((r) => r.status === "graded" && r.grade != null);
  const avg = (rs: SubmissionRow[]) => rs.length ? Math.round(rs.reduce((a, r) => a + (Number(r.grade) || 0), 0) / rs.length) : 0;
  const split = (t: string): AssignmentSplit => {
    const rs = gradedRows.filter((r) => r.type === t);
    return { graded: rs.length, avg: avg(rs) };
  };
  return {
    total: list.length, submitted, graded: gradedRows.length, avgGrade: avg(gradedRows),
    cbt: split("cbt"), written: split("written"),
  };
}

// ── Practice ────────────────────────────────────────────────────
export type PracticeRow = { total: number; correct: number };
export function summarisePractice(rows: PracticeRow[]): { rounds: number; questions: number; correct: number; accuracy: number } {
  const list = rows ?? [];
  const questions = list.reduce((a, r) => a + (Number(r.total) || 0), 0);
  const correct = list.reduce((a, r) => a + (Number(r.correct) || 0), 0);
  return { rounds: list.length, questions, correct, accuracy: questions ? Math.round((correct / questions) * 100) : 0 };
}

// ── Attendance ──────────────────────────────────────────────────
export function summariseAttendance(rows: { present: boolean }[]): { sessions: number; present: number; rate: number } {
  const list = rows ?? [];
  const present = list.filter((r) => r.present).length;
  return { sessions: list.length, present, rate: list.length ? Math.round((present / list.length) * 100) : 0 };
}
