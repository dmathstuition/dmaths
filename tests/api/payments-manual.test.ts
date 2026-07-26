import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST, PATCH, DELETE } from "@/app/api/payments/manual/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/payments/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchReq(body: unknown) {
  return new Request("https://dmaths.test/api/payments/manual", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const delReq = (reference: string) =>
  new Request(`https://dmaths.test/api/payments/manual?reference=${encodeURIComponent(reference)}`, { method: "DELETE" });

const MANUAL_ROW = { reference: "REF-1", amount: 10000, email: "a@b.com", student_id: null, paid_at: null, raw: { source: "manual-entry" } };
const PAYSTACK_ROW = { reference: "PSK-1", amount: 50000, email: "c@d.com", raw: {} };

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

function asAdmin() {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
}

describe("POST /api/payments/manual", () => {
  it("records a manual payment into the ledger", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "pay-1", reference: "REF-1" }, error: null });

    const res = await POST(req({ email: "Parent@Example.com", amount: 25000, method: "Cash", reference: "REF-1" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("payments");
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(expect.objectContaining({
      reference: "REF-1",
      email: "parent@example.com", // normalised
      amount: 25000,
      channel: "Manual · Cash",
      status: "success",
    }));
    expect(mockAdmin.from).toHaveBeenCalledWith("audit_log");
  });

  it("auto-generates a reference when none is given", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "pay-1" }, error: null });

    const res = await POST(req({ email: "a@b.com", amount: 5000, method: "Opay Bank Transfer" }));
    expect(res.status).toBe(200);
    const inserted = mockAdmin._qb.insert.mock.calls.find(
      (c: any[]) => c[0]?.channel === "Manual · Opay Bank Transfer",
    )?.[0];
    expect(inserted.reference).toMatch(/^MANUAL-/);
  });

  it("rejects with neither a learner nor an email, or a bad amount", async () => {
    asAdmin();
    expect((await POST(req({ amount: 5000 }))).status).toBe(400);
    expect((await POST(req({ email: "a@b.com", amount: 0 }))).status).toBe(400);
    expect((await POST(req({ email: "a@b.com", amount: -5 }))).status).toBe(400);
  });

  it("links the payment to a chosen learner and inherits their email", async () => {
    asAdmin();
    // Both the student lookup and the (no-op) subscriber lookup read maybeSingle.
    mockAdmin._qb.maybeSingle.mockResolvedValue({
      data: { id: "stu-7", email: "Ada@Example.com", role: "student", sub_active: false }, error: null,
    });
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "pay-1", reference: "REF-9" }, error: null });

    // No email supplied — it should come from the learner's own record.
    const res = await POST(req({ studentId: "stu-7", amount: 30000, method: "Cash", reference: "REF-9" }));
    expect(res.status).toBe(200);

    const inserted = mockAdmin._qb.insert.mock.calls.find((c: any[]) => c[0]?.reference === "REF-9")?.[0];
    expect(inserted.student_id).toBe("stu-7");
    expect(inserted.email).toBe("ada@example.com"); // normalised from the learner
  });

  it("refuses a studentId that isn't a real learner", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(req({ studentId: "ghost", amount: 5000 }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("still records against a bare email with no learner chosen", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "pay-2", reference: "REF-2" }, error: null });
    const res = await POST(req({ email: "grandma@example.com", amount: 12000, reference: "REF-2" }));
    expect(res.status).toBe(200);
    const inserted = mockAdmin._qb.insert.mock.calls.find((c: any[]) => c[0]?.reference === "REF-2")?.[0];
    expect(inserted).not.toHaveProperty("student_id");
  });

  it("403 for non-admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    expect((await POST(req({ email: "a@b.com", amount: 5000 }))).status).toBe(403);
  });

  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(req({ email: "a@b.com", amount: 5000 }))).status).toBe(401);
  });
});

describe("PATCH /api/payments/manual", () => {
  it("edits a manual payment and never changes the reference", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: MANUAL_ROW, error: null }); // the target
    const res = await PATCH(patchReq({ reference: "REF-1", email: "new@b.com", amount: 20000, method: "Cash" }));
    expect(res.status).toBe(200);

    const update = mockAdmin._qb.update.mock.calls[0][0];
    expect(update.amount).toBe(20000);
    expect(update.email).toBe("new@b.com");
    expect(update.channel).toBe("Manual · Cash");
    expect(update).not.toHaveProperty("reference"); // the receipts FK is untouched
    expect(mockAdmin.from).toHaveBeenCalledWith("audit_log");
  });

  // The whole point of the manual-only guard: real card money can't be rewritten.
  it("refuses to edit a Paystack row", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: PAYSTACK_ROW, error: null });
    const res = await PATCH(patchReq({ reference: "PSK-1", amount: 1, method: "Cash" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });

  it("404s a reference that isn't in the ledger", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await PATCH(patchReq({ reference: "ghost", amount: 5000, method: "Cash" }))).status).toBe(404);
  });

  it("still validates the amount on edit", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: MANUAL_ROW, error: null });
    const res = await PATCH(patchReq({ reference: "REF-1", email: "a@b.com", amount: 0, method: "Cash" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });

  it("403 for non-admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    expect((await PATCH(patchReq({ reference: "REF-1", amount: 5000, method: "Cash" }))).status).toBe(403);
  });
});

describe("DELETE /api/payments/manual", () => {
  it("deletes a manual payment and audits it", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: MANUAL_ROW, error: null })   // the target
      .mockResolvedValueOnce({ data: null, error: null });        // no receipt
    const res = await DELETE(delReq("REF-1"));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.delete).toHaveBeenCalled();
    expect(mockAdmin.from).toHaveBeenCalledWith("audit_log");
  });

  it("reports when a receipt was removed with it", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: MANUAL_ROW, error: null })
      .mockResolvedValueOnce({ data: { serial: "RCT-2026-ABC123" }, error: null });
    const res = await DELETE(delReq("REF-1"));
    await expect(res.json()).resolves.toMatchObject({ ok: true, hadReceipt: true });
  });

  it("refuses to delete a Paystack row", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: PAYSTACK_ROW, error: null });
    const res = await DELETE(delReq("PSK-1"));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });

  it("treats an already-gone payment as a successful delete", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await DELETE(delReq("gone"));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });

  it("403 for non-admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    expect((await DELETE(delReq("REF-1"))).status).toBe(403);
  });
});
