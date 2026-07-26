// What a learner has paid this month, and what (if anything) they still owe.
//
// The owing model is the monthly subscription already on the profile:
//   sub_active   — is there a monthly fee at all?
//   sub_amount   — the fee, in naira
//   sub_due_date — when this month's fee is due
//
// "Paid this month" is the sum of successful payments dated in the current
// calendar month — simple and predictable for a parent reading it. Pure and
// dependency-free so the arithmetic is testable without a database.

export type PaymentRow = {
  amount: number | string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type Subscription = {
  sub_active?: boolean | null;
  sub_amount?: number | string | null;
  sub_due_date?: string | null;
};

export type OwingSummary = {
  hasPlan: boolean;
  monthlyFee: number;
  paidThisMonth: number;
  owing: number;
  dueDate: string | null;
  overdue: boolean;
  state: "no-plan" | "paid" | "owing" | "overdue";
};

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// First instant of `ref`'s calendar month, in UTC. Payments are stamped in UTC;
// a WAT/UTC boundary at month end is close enough for a fee summary and keeps
// the rule one everyone can follow.
function monthStart(ref: Date): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
}

export function paidInMonth(payments: PaymentRow[], ref: Date = new Date()): number {
  const start = monthStart(ref).getTime();
  const nextMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1)).getTime();
  return payments.reduce((sum, p) => {
    if ((p.status ?? "success") !== "success") return sum;
    const when = new Date(p.paid_at || p.created_at || 0).getTime();
    if (isNaN(when) || when < start || when >= nextMonth) return sum;
    return sum + num(p.amount);
  }, 0);
}

export function owingSummary(
  sub: Subscription,
  payments: PaymentRow[],
  ref: Date = new Date(),
): OwingSummary {
  const monthlyFee = sub.sub_active ? num(sub.sub_amount) : 0;
  const paidThisMonth = paidInMonth(payments, ref);
  const hasPlan = !!sub.sub_active && monthlyFee > 0;
  const owing = hasPlan ? Math.max(0, monthlyFee - paidThisMonth) : 0;

  const dueDate = sub.sub_due_date ?? null;
  // Overdue = there's still a balance and the due date has already passed.
  const overdue = hasPlan && owing > 0 && !!dueDate && new Date(dueDate) < ref;

  const state: OwingSummary["state"] = !hasPlan
    ? "no-plan"
    : owing === 0
      ? "paid"
      : overdue ? "overdue" : "owing";

  return { hasPlan, monthlyFee, paidThisMonth, owing, dueDate, overdue, state };
}

export const fmtNaira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
