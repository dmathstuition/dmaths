// Pure "week in review" rollup for a child, shown to their parent. Kept free of
// I/O so the 7-day windowing and the aggregates are unit-testable; the parent
// page reads the rows with the service role and calls this.

const DAY = 86_400_000;

// True when `at` falls within the last 7 days (and isn't in the future).
export function inLastWeek(at: string | null | undefined, now: Date = new Date()): boolean {
  if (!at) return false;
  const t = new Date(at).getTime();
  if (isNaN(t)) return false;
  return t <= now.getTime() && now.getTime() - t < 7 * DAY;
}

export type WeeklyInput = {
  now?: Date;
  practice: { at: string; points?: number }[];
  mocks: { at: string; percent?: number; band?: string; points?: number }[];
  graded: { at: string; grade?: number | null }[];
  attendance: { at: string; present: boolean }[];
  behaviour: { at: string; points?: number }[];
  streak: number;
};

export type WeeklySummary = {
  practiceRounds: number;
  mocks: number;
  bestMockPercent: number | null;
  bestMockBand: string;
  assignmentsGraded: number;
  avgGrade: number | null;
  present: number;
  classes: number;
  positiveNotes: number;
  negativeNotes: number;
  pointsThisWeek: number;
  streak: number;
  active: boolean;
};

export function summariseWeek(inp: WeeklyInput): WeeklySummary {
  const now = inp.now ?? new Date();
  const wk = <T extends { at: string }>(rows: T[]) => rows.filter((r) => inLastWeek(r.at, now));

  const practice = wk(inp.practice);
  const mocks = wk(inp.mocks);
  const graded = wk(inp.graded);
  const attendance = wk(inp.attendance);
  const behaviour = wk(inp.behaviour);

  const bestMock = mocks.reduce<{ percent: number; band: string } | null>((best, m) => {
    const p = Number(m.percent ?? 0);
    return !best || p > best.percent ? { percent: p, band: String(m.band ?? "") } : best;
  }, null);

  const gradedWithScore = graded.filter((g) => g.grade != null && !isNaN(Number(g.grade)));
  const avgGrade = gradedWithScore.length
    ? Math.round(gradedWithScore.reduce((a, g) => a + Number(g.grade), 0) / gradedWithScore.length)
    : null;

  const present = attendance.filter((a) => a.present).length;

  const positiveNotes = behaviour.filter((b) => Number(b.points ?? 0) > 0).length;
  const negativeNotes = behaviour.filter((b) => Number(b.points ?? 0) < 0).length;

  const pointsThisWeek =
    practice.reduce((a, r) => a + Math.max(0, Number(r.points ?? 0)), 0) +
    mocks.reduce((a, r) => a + Math.max(0, Number(r.points ?? 0)), 0) +
    behaviour.reduce((a, r) => a + Math.max(0, Number(r.points ?? 0)), 0);

  return {
    practiceRounds: practice.length,
    mocks: mocks.length,
    bestMockPercent: bestMock ? bestMock.percent : null,
    bestMockBand: bestMock ? bestMock.band : "",
    assignmentsGraded: graded.length,
    avgGrade,
    present,
    classes: attendance.length,
    positiveNotes,
    negativeNotes,
    pointsThisWeek,
    streak: Math.max(0, Number(inp.streak) || 0),
    active: practice.length > 0 || mocks.length > 0 || graded.length > 0 || present > 0,
  };
}
