// Attendance-based monthly billing.
//
// Tuition is charged per hour. A learner's bill for a month is the sum, over
// every class session they attended that month, of:
//     (class length in hours) × (that class's hourly rate)
// The hourly rate comes from the class's rate tier (see lib/pricing). Pure and
// dependency-light so the arithmetic is testable without a database.

import { ratePerHour } from "@/lib/pricing";

export type AttendedSession = {
  present?: boolean | null;
  session_date?: string | null;   // "YYYY-MM-DD"
  durationMinutes?: number | null; // from the class (defaults to 60)
  rateTier?: string | null;        // from the class
};

export type BillLine = { tier: string; hours: number; rate: number; amount: number };
export type MonthlyBill = {
  monthKey: string;      // "YYYY-MM"
  sessions: number;      // attended sessions counted
  hours: number;         // total attended hours
  amount: number;        // total owed, in naira
  lines: BillLine[];     // per-tier breakdown, largest first
};

// "YYYY-MM" for a reference date, in UTC (session dates are plain calendar
// dates, so a fixed zone keeps the month boundary predictable).
export function monthKey(ref: Date = new Date()): string {
  return `${ref.getUTCFullYear()}-${String(ref.getUTCMonth() + 1).padStart(2, "0")}`;
}

const hoursOf = (mins: unknown) => {
  const n = Number(mins);
  return Number.isFinite(n) && n > 0 ? n / 60 : 1; // default a session to 1 hour
};

export function computeMonthlyBill(sessions: AttendedSession[], ref: Date = new Date()): MonthlyBill {
  const key = monthKey(ref);
  const byTier = new Map<string, { hours: number; rate: number }>();
  let totalHours = 0, totalAmount = 0, counted = 0;

  for (const s of Array.isArray(sessions) ? sessions : []) {
    if (s?.present === false) continue;                       // absences don't bill
    const date = String(s?.session_date ?? "");
    if (date.slice(0, 7) !== key) continue;                   // other months
    const tier = String(s?.rateTier ?? "standard") || "standard";
    const rate = ratePerHour(tier);
    const hrs = hoursOf(s?.durationMinutes);

    const acc = byTier.get(tier) ?? { hours: 0, rate };
    acc.hours += hrs;
    byTier.set(tier, acc);

    totalHours += hrs;
    totalAmount += hrs * rate;
    counted++;
  }

  const lines: BillLine[] = [...byTier.entries()]
    .map(([tier, v]) => ({ tier, hours: v.hours, rate: v.rate, amount: v.hours * v.rate }))
    .sort((a, b) => b.amount - a.amount);

  return {
    monthKey: key,
    sessions: counted,
    hours: Math.round(totalHours * 100) / 100,
    amount: Math.round(totalAmount),
    lines,
  };
}

// Last calendar day of the reference month as "YYYY-MM-DD" (UTC) — the due date
// for the month's attendance bill.
export function monthEndDate(ref: Date = new Date()): string {
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

// True when `ref` is within the last `days` days of its month — the window in
// which the month's bill is raised and sent to parents.
export function isNearMonthEnd(ref: Date = new Date(), days = 3): boolean {
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0));
  const daysLeft = Math.floor((end.getTime() - Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())) / 86_400_000);
  return daysLeft <= days - 1;
}
