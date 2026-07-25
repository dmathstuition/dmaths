// Builds a GitHub-style activity grid from a list of dates. Pure +
// deterministic (unit-tested): all date maths is UTC date-only, so timezone
// and DST can never shift a day into the wrong cell.

export type HeatDay = { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 };

const DAY_MS = 86_400_000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function utcMidnight(input: Date | string): Date {
  const s = typeof input === "string" ? input.slice(0, 10) : dayKey(input);
  return new Date(`${s}T00:00:00Z`);
}

// 0 = none, then increasing intensity. Kept coarse so a couple of activities
// already reads as a "good" day for a learner.
export function levelFor(count: number): HeatDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

// Returns `weeks` columns of 7 days (Sun→Sat), ending with the week containing
// `today`. Dates outside the window are ignored; duplicates count up.
export function buildHeatmap(dates: (string | null | undefined)[], weeks = 26, today: Date = new Date()): HeatDay[][] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (!d) continue;
    const key = String(d).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const end = utcMidnight(today);
  // Walk back to the Sunday that starts the first visible week.
  const endWeekStart = new Date(end.getTime() - end.getUTCDay() * DAY_MS);
  const start = new Date(endWeekStart.getTime() - (weeks - 1) * 7 * DAY_MS);

  const grid: HeatDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatDay[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const key = dayKey(cur);
      // Days after today are placeholders with no activity.
      const count = cur.getTime() > end.getTime() ? 0 : counts.get(key) ?? 0;
      col.push({ date: key, count, level: levelFor(count) });
    }
    grid.push(col);
  }
  return grid;
}

// Longest run of consecutive active days ending on/just before today.
export function currentStreak(dates: (string | null | undefined)[], today: Date = new Date()): number {
  const set = new Set(
    dates.filter(Boolean).map((d) => String(d).slice(0, 10)),
  );
  let streak = 0;
  let cursor = utcMidnight(today);
  // Allow today to be empty without breaking a streak earned yesterday.
  if (!set.has(dayKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}
