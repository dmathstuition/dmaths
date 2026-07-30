import { describe, it, expect } from "vitest";
import { availableYears, buildStatement, describePayment } from "@/lib/statement";

const pay = (paid_at: string, amount: number, channel = "card", reference = paid_at) =>
  ({ reference, amount, channel, paid_at });

const ROWS = [
  pay("2026-01-12T09:00:00Z", 25000, "Manual · Cash", "A"),
  pay("2026-02-05T09:00:00Z", 25000, "card", "B"),
  pay("2025-11-30T09:00:00Z", 30000, "bank", "C"),
];

describe("describePayment", () => {
  it("reads a manual channel as the method", () => {
    expect(describePayment("Manual · Bank Transfer")).toBe("Bank Transfer (manual)");
  });
  it("reads an online channel with a capital and label", () => {
    expect(describePayment("card")).toBe("Card (online)");
  });
  it("falls back to 'Payment' when there's no channel", () => {
    expect(describePayment("")).toBe("Payment");
    expect(describePayment(null)).toBe("Payment");
  });
});

describe("availableYears", () => {
  it("lists the years with payments, newest first, de-duplicated", () => {
    expect(availableYears(ROWS)).toEqual([2026, 2025]);
  });
  it("ignores rows with an unreadable date", () => {
    expect(availableYears([{ reference: "x", amount: 1, paid_at: "nope" }])).toEqual([]);
  });
});

describe("buildStatement", () => {
  it("filters to a calendar year, newest first, and totals it", () => {
    const { lines, total } = buildStatement(ROWS, 2026);
    expect(lines.map((l) => l.reference)).toEqual(["B", "A"]); // Feb before Jan
    expect(total).toBe(50000);
  });

  it("returns everything when the year is null (all time)", () => {
    const { lines, total } = buildStatement(ROWS, null);
    expect(lines).toHaveLength(3);
    expect(total).toBe(80000);
  });

  it("is empty for a year with no payments", () => {
    expect(buildStatement(ROWS, 2024)).toEqual({ lines: [], total: 0 });
  });

  it("uses created_at when paid_at is missing, and skips undated rows", () => {
    const rows = [
      { reference: "D", amount: 5000, paid_at: null, created_at: "2026-03-01T00:00:00Z", channel: "card" },
      { reference: "E", amount: 9999, paid_at: null, created_at: null, channel: "card" },
    ];
    const { lines, total } = buildStatement(rows, 2026);
    expect(lines.map((l) => l.reference)).toEqual(["D"]);
    expect(total).toBe(5000);
  });

  it("coerces string/blank amounts safely", () => {
    const rows = [
      { reference: "F", amount: "12000", paid_at: "2026-04-01T00:00:00Z", channel: "card" },
      { reference: "G", amount: null, paid_at: "2026-04-02T00:00:00Z", channel: "card" },
    ];
    expect(buildStatement(rows, 2026).total).toBe(12000);
  });
});
