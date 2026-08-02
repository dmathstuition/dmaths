import { describe, it, expect } from "vitest";
import { paidInMonth, owingSummary, invoiceNumber, monthLabel } from "@/lib/payments";

const REF = new Date("2026-08-15T10:00:00.000Z");
const on = (day: string, amount: number, status = "success") =>
  ({ amount, status, paid_at: `2026-${day}T09:00:00.000Z` });

describe("paidInMonth", () => {
  it("sums only successful payments dated in the reference month", () => {
    const rows = [
      on("08-01", 10000),
      on("08-14", 5000),
      on("07-31", 9999),          // previous month
      on("09-01", 9999),          // next month
      on("08-10", 3000, "failed"), // not successful
    ];
    expect(paidInMonth(rows, REF)).toBe(15000);
  });

  it("treats a missing status as success (manual entries)", () => {
    expect(paidInMonth([{ amount: 2000, paid_at: "2026-08-05T00:00:00Z" }], REF)).toBe(2000);
  });

  it("falls back to created_at when paid_at is absent", () => {
    expect(paidInMonth([{ amount: 4000, created_at: "2026-08-09T00:00:00Z", paid_at: null }], REF)).toBe(4000);
  });

  it("ignores rows with an unreadable date", () => {
    expect(paidInMonth([{ amount: 5000, paid_at: "whenever" }], REF)).toBe(0);
  });
});

describe("owingSummary", () => {
  it("says nothing to owe when there is no monthly plan", () => {
    const s = owingSummary({ sub_active: false, sub_amount: 0 }, [on("08-01", 5000)], REF);
    expect(s.hasPlan).toBe(false);
    expect(s.state).toBe("no-plan");
    expect(s.owing).toBe(0);
  });

  it("computes the balance for a partly-paid month", () => {
    const s = owingSummary(
      { sub_active: true, sub_amount: 25000, sub_due_date: "2026-08-31" },
      [on("08-02", 10000)],
      REF,
    );
    expect(s.monthlyFee).toBe(25000);
    expect(s.paidThisMonth).toBe(10000);
    expect(s.owing).toBe(15000);
    expect(s.state).toBe("owing");
    expect(s.overdue).toBe(false);
  });

  it("marks a fully-paid month as up to date", () => {
    const s = owingSummary(
      { sub_active: true, sub_amount: 25000, sub_due_date: "2026-08-31" },
      [on("08-02", 25000)],
      REF,
    );
    expect(s.owing).toBe(0);
    expect(s.state).toBe("paid");
  });

  it("never shows a negative balance when overpaid", () => {
    const s = owingSummary({ sub_active: true, sub_amount: 25000 }, [on("08-02", 40000)], REF);
    expect(s.owing).toBe(0);
    expect(s.state).toBe("paid");
  });

  it("flags overdue once the due date has passed with a balance", () => {
    const s = owingSummary(
      { sub_active: true, sub_amount: 25000, sub_due_date: "2026-08-10" },
      [on("08-01", 5000)],
      REF, // 15 Aug — past the 10th
    );
    expect(s.owing).toBe(20000);
    expect(s.overdue).toBe(true);
    expect(s.state).toBe("overdue");
  });

  it("is not overdue if the balance is cleared, even past the due date", () => {
    const s = owingSummary(
      { sub_active: true, sub_amount: 25000, sub_due_date: "2026-08-10" },
      [on("08-01", 25000)],
      REF,
    );
    expect(s.overdue).toBe(false);
    expect(s.state).toBe("paid");
  });
});

describe("invoiceNumber", () => {
  const REF = new Date("2026-08-15T10:00:00.000Z");
  it("is deterministic per learner per month and sortable", () => {
    expect(invoiceNumber("DM-2026-0001", REF)).toBe("INV-2026-08-DM20260001");
    // Same inputs → same number (re-opening never mints a new one).
    expect(invoiceNumber("DM-2026-0001", REF)).toBe(invoiceNumber("DM-2026-0001", REF));
  });
  it("falls back to ACCT when there's no student code", () => {
    expect(invoiceNumber(null, REF)).toBe("INV-2026-08-ACCT");
    expect(invoiceNumber("", REF)).toBe("INV-2026-08-ACCT");
  });
});

describe("monthLabel", () => {
  it("renders a human month + year", () => {
    expect(monthLabel(new Date("2026-08-15T10:00:00.000Z"))).toBe("August 2026");
  });
});
