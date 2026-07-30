import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { issueReceiptFor, autoIssueReceipt, receiptSerial } from "@/lib/receipts";

let admin: ReturnType<typeof makeMockSupabaseClient>;

const PAYMENT = { reference: "PSK-1", email: "Mum@Example.com", amount: 50000, paid_at: "2026-03-01T10:00:00Z", status: "success", student_id: "stu-1" };

// The helper reads via maybeSingle in order: payment, prior receipt, (maybe)
// student lookups; and inserts via single. Queue maybeSingle answers.
function maybe(...seq: any[]) {
  let i = 0;
  admin._qb.maybeSingle.mockImplementation(async () => seq[i++] ?? { data: null, error: null });
}

beforeEach(() => {
  admin = makeMockSupabaseClient();
  sendEmail.mockClear();
  admin._qb.single.mockResolvedValue({ data: { id: "r1", serial: "RCT-2026-ABC123" }, error: null });
});

describe("receiptSerial", () => {
  it("has the RCT-YEAR-XXXXXX shape", () => {
    expect(receiptSerial()).toMatch(/^RCT-\d{4}-[A-Z0-9]{6}$/);
  });
});

describe("issueReceiptFor", () => {
  it("issues a receipt for a successful payment and emails the payer", async () => {
    maybe({ data: PAYMENT, error: null }, { data: null, error: null }); // payment, no prior
    const res = await issueReceiptFor(admin as any, "PSK-1", { issuedBy: "admin-1" });
    expect(res).toMatchObject({ ok: true, alreadyIssued: false });

    const row = admin._qb.insert.mock.calls[0][0];
    expect(row.payment_reference).toBe("PSK-1");
    expect(row.student_id).toBe("stu-1");       // taken from the payment's own link
    expect(row.payer_email).toBe("mum@example.com");
    expect(row.serial).toMatch(/^RCT-/);
    expect(sendEmail).toHaveBeenCalledWith("receipt_issued", "mum@example.com", expect.any(Object));
  });

  it("returns the existing receipt instead of a second one (idempotent)", async () => {
    maybe({ data: PAYMENT, error: null }, { data: { id: "r-old", serial: "RCT-2026-OLD999" }, error: null });
    const res = await issueReceiptFor(admin as any, "PSK-1");
    expect(res).toMatchObject({ ok: true, alreadyIssued: true, receipt: { serial: "RCT-2026-OLD999" } });
    expect(admin._qb.insert).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses a payment that never succeeded", async () => {
    maybe({ data: { ...PAYMENT, status: "failed" }, error: null });
    const res = await issueReceiptFor(admin as any, "PSK-1");
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect(admin._qb.insert).not.toHaveBeenCalled();
  });

  it("404s a reference that isn't in the ledger", async () => {
    maybe({ data: null, error: null });
    expect(await issueReceiptFor(admin as any, "ghost")).toMatchObject({ ok: false, status: 404 });
  });

  it("400s an empty reference without touching the database", async () => {
    expect(await issueReceiptFor(admin as any, "  ")).toMatchObject({ ok: false, status: 400 });
    expect(admin._qb.maybeSingle).not.toHaveBeenCalled();
  });

  it("reports the missing table as a soft 503, not a crash", async () => {
    maybe({ data: PAYMENT, error: null }, { data: null, error: null });
    admin._qb.single.mockResolvedValue({ data: null, error: { message: 'relation "receipts" does not exist' } });
    const res = await issueReceiptFor(admin as any, "PSK-1");
    expect(res).toMatchObject({ ok: false, status: 503, missingTable: true });
  });
});

describe("autoIssueReceipt", () => {
  it("never throws, even when issuing blows up", async () => {
    admin.from = vi.fn(() => { throw new Error("boom"); }) as any;
    await expect(autoIssueReceipt(admin as any, "PSK-1")).resolves.toBeUndefined();
  });
});
