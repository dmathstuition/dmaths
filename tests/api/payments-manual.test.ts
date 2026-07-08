import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST } from "@/app/api/payments/manual/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/payments/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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

  it("rejects a missing email or bad amount", async () => {
    asAdmin();
    expect((await POST(req({ amount: 5000 }))).status).toBe(400);
    expect((await POST(req({ email: "a@b.com", amount: 0 }))).status).toBe(400);
    expect((await POST(req({ email: "a@b.com", amount: -5 }))).status).toBe(400);
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
