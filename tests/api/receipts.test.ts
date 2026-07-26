import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { POST, DELETE } from "@/app/api/receipts/route";

const req = (body?: unknown, qs = "") =>
  new Request(`https://dmaths.test/api/receipts${qs}`, {
    method: body ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

const PAYMENT = {
  reference: "PSK-123", email: "Mum@Example.com", amount: 50000,
  paid_at: "2026-03-01T10:00:00.000Z", status: "success",
};

function signedIn(role: string) {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role }, error: null });
}

// The route reads three things in order: the payment, any existing receipt,
// then (maybe) a profile lookup. Queue the answers in that order.
function adminAnswers(...answers: any[]) {
  let i = 0;
  mockAdmin._qb.maybeSingle.mockImplementation(async () => answers[i++] ?? { data: null, error: null });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  sendEmail.mockClear();
  mockAdmin._qb.single.mockResolvedValue({ data: { id: "r1", serial: "RCT-2026-ABC123" }, error: null });
});

describe("POST /api/receipts", () => {
  it("403s anyone who isn't an admin", async () => {
    signedIn("tutor");
    expect((await POST(req({ reference: "PSK-123" }))).status).toBe(403);

    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(req({ reference: "PSK-123" }))).status).toBe(403);
  });

  it("400s without a reference", async () => {
    signedIn("admin");
    expect((await POST(req({}))).status).toBe(400);
  });

  it("404s for a reference that isn't in the ledger", async () => {
    signedIn("admin");
    adminAnswers({ data: null, error: null });
    expect((await POST(req({ reference: "nope" }))).status).toBe(404);
  });

  // Receipting money that never arrived would be a false record.
  it("refuses a payment that didn't succeed", async () => {
    signedIn("admin");
    adminAnswers({ data: { ...PAYMENT, status: "failed" }, error: null });
    const res = await POST(req({ reference: "PSK-123" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("issues a numbered receipt and emails the payer", async () => {
    signedIn("admin");
    adminAnswers(
      { data: PAYMENT, error: null },   // the payment
      { data: null, error: null },      // no receipt yet
      { data: { id: "stu-1", role: "student" }, error: null }, // payer is a learner
    );

    const res = await POST(req({ reference: "PSK-123", note: "First term fees" }));
    expect(res.status).toBe(200);

    const row = mockAdmin._qb.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      payment_reference: "PSK-123",
      payer_email: "mum@example.com",   // normalised
      amount: 50000,
      note: "First term fees",
      issued_by: "admin-1",
    });
    expect(row.serial).toMatch(/^RCT-\d{4}-[A-Z0-9]{6}$/);
    expect(sendEmail).toHaveBeenCalledWith("receipt_issued", "mum@example.com", expect.objectContaining({
      serial: "RCT-2026-ABC123",
    }));
  });

  // A receipt number a family already holds must never change.
  it("returns the existing receipt instead of issuing a second number", async () => {
    signedIn("admin");
    adminAnswers(
      { data: PAYMENT, error: null },
      { data: { id: "r-old", serial: "RCT-2026-OLD999" }, error: null },
    );

    const res = await POST(req({ reference: "PSK-123" }));
    await expect(res.json()).resolves.toMatchObject({
      alreadyIssued: true, receipt: { serial: "RCT-2026-OLD999" },
    });
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("records the issue in the audit log", async () => {
    signedIn("admin");
    adminAnswers({ data: PAYMENT, error: null }, { data: null, error: null }, { data: null, error: null });
    await POST(req({ reference: "PSK-123" }));
    expect(mockAdmin.from).toHaveBeenCalledWith("audit_log");
  });
});

describe("DELETE /api/receipts", () => {
  it("403s a non-admin", async () => {
    signedIn("parent");
    expect((await DELETE(req(undefined, "?id=r1"))).status).toBe(403);
  });

  it("400s without an id", async () => {
    signedIn("admin");
    expect((await DELETE(req(undefined))).status).toBe(400);
  });

  it("voids a receipt issued by mistake", async () => {
    signedIn("admin");
    const res = await DELETE(req(undefined, "?id=r1"));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.delete).toHaveBeenCalled();
  });
});
