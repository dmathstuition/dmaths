// Month-over-month trend helpers for the admin dashboard stat cards.
// Pure and testable. All return null when there's no prior-month baseline, so
// the UI shows a plain label instead of a misleading percentage.

function monthIndex(d: Date) {
  return d.getFullYear() * 12 + d.getMonth();
}

export function pctChange(cur: number, prev: number): number | null {
  if (prev <= 0) return null; // no baseline to compare against
  return Math.round(((cur - prev) / prev) * 100);
}

// % change in the *count* of dated rows this month vs last month.
export function countTrend(dates: (string | null | undefined)[], now: Date = new Date()): number | null {
  const curKey = monthIndex(now);
  let cur = 0, prev = 0;
  for (const s of dates) {
    if (!s) continue;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) continue;
    const k = monthIndex(d);
    if (k === curKey) cur++;
    else if (k === curKey - 1) prev++;
  }
  return pctChange(cur, prev);
}

// % change in a *sum* (e.g. revenue) this month vs last month.
export function sumTrend(rows: { date: string | null | undefined; amount: number }[], now: Date = new Date()): number | null {
  const curKey = monthIndex(now);
  let cur = 0, prev = 0;
  for (const r of rows) {
    if (!r.date) continue;
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) continue;
    const k = monthIndex(d);
    if (k === curKey) cur += Number(r.amount || 0);
    else if (k === curKey - 1) prev += Number(r.amount || 0);
  }
  return pctChange(cur, prev);
}
