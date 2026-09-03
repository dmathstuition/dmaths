import { describe, it, expect } from "vitest";
import { computeMonthlyBill, monthKey, monthEndDate, isNearMonthEnd } from "@/lib/attendanceBilling";

const REF = new Date("2026-06-15T12:00:00Z"); // June 2026 (30 days)

describe("computeMonthlyBill", () => {
  it("charges attended hours × the class's hourly rate", () => {
    // 2h standard (18000) + 1h coding (25000) = 36000 + 25000 = 61000
    const bill = computeMonthlyBill([
      { present: true, session_date: "2026-06-03", durationMinutes: 120, rateTier: "standard" },
      { present: true, session_date: "2026-06-10", durationMinutes: 60, rateTier: "coding" },
    ], REF);
    expect(bill.hours).toBe(3);
    expect(bill.amount).toBe(61000);
    expect(bill.sessions).toBe(2);
    expect(bill.lines[0].tier).toBe("standard"); // largest amount first (₦36k > ₦25k)
  });

  it("ignores absences and sessions from other months", () => {
    const bill = computeMonthlyBill([
      { present: true, session_date: "2026-06-01", durationMinutes: 60, rateTier: "standard" },
      { present: false, session_date: "2026-06-02", durationMinutes: 60, rateTier: "standard" },
      { present: true, session_date: "2026-05-30", durationMinutes: 60, rateTier: "standard" },
      { present: true, session_date: "2026-07-01", durationMinutes: 60, rateTier: "standard" },
    ], REF);
    expect(bill.sessions).toBe(1);
    expect(bill.amount).toBe(18000);
  });

  it("defaults a session with no duration to one hour and unknown tier to standard", () => {
    const bill = computeMonthlyBill([{ present: true, session_date: "2026-06-05" }], REF);
    expect(bill.hours).toBe(1);
    expect(bill.amount).toBe(18000);
  });

  it("is zero when nothing was attended", () => {
    expect(computeMonthlyBill([], REF).amount).toBe(0);
  });
});

describe("month helpers", () => {
  it("monthKey and monthEndDate", () => {
    expect(monthKey(REF)).toBe("2026-06");
    expect(monthEndDate(REF)).toBe("2026-06-30");
    expect(monthEndDate(new Date("2026-02-10T00:00:00Z"))).toBe("2026-02-28");
  });
  it("isNearMonthEnd is true only within the last 3 days", () => {
    expect(isNearMonthEnd(new Date("2026-06-28T00:00:00Z"), 3)).toBe(true); // 3 days left
    expect(isNearMonthEnd(new Date("2026-06-30T00:00:00Z"), 3)).toBe(true);
    expect(isNearMonthEnd(new Date("2026-06-27T00:00:00Z"), 3)).toBe(false); // 4 days left
    expect(isNearMonthEnd(new Date("2026-06-15T00:00:00Z"), 3)).toBe(false);
  });
});
