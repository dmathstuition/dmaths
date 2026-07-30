// Build a payment statement for a learner: the payments received in a period and
// their total. Pure and dependency-free so the date/total logic is testable.
//
// This is a statement of money RECEIVED (not a charges ledger — the app doesn't
// track per-term charges beyond the monthly subscription), so it lists payments
// and their sum. Honest and simple.

export type StatementPayment = {
  reference: string;
  amount: number | string | null;
  channel?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type StatementLine = {
  reference: string;
  date: string;        // ISO of paid_at (or created_at)
  description: string;
  amount: number;
};

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const whenOf = (p: StatementPayment) => p.paid_at || p.created_at || "";

// A readable description from the channel: "Manual · Cash" → "Cash (manual)";
// a Paystack channel like "card" → "Card / bank (online)".
export function describePayment(channel?: string | null): string {
  const c = String(channel ?? "").trim();
  if (!c) return "Payment";
  const m = c.match(/^Manual · (.+)$/);
  if (m) return `${m[1]} (manual)`;
  return `${c.charAt(0).toUpperCase()}${c.slice(1)} (online)`;
}

// The calendar years that have at least one payment, newest first.
export function availableYears(payments: StatementPayment[]): number[] {
  const years = new Set<number>();
  for (const p of payments) {
    const t = new Date(whenOf(p));
    if (!isNaN(t.getTime())) years.add(t.getUTCFullYear());
  }
  return [...years].sort((a, b) => b - a);
}

// The statement lines for a given calendar year (or all time when year is null),
// newest first, with the total.
export function buildStatement(payments: StatementPayment[], year: number | null): { lines: StatementLine[]; total: number } {
  const lines: StatementLine[] = [];
  for (const p of payments) {
    const when = new Date(whenOf(p));
    if (isNaN(when.getTime())) continue;
    if (year !== null && when.getUTCFullYear() !== year) continue;
    lines.push({
      reference: p.reference,
      date: when.toISOString(),
      description: describePayment(p.channel),
      amount: num(p.amount),
    });
  }
  lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}
