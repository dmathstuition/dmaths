import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const sendEmail = vi.fn(async () => true);
vi.mock("@/lib/email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { POST } from "@/app/api/students/import/route";

const req = (csv: string) =>
  new Request("https://dmaths.test/api/students/import", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }),
  });

const HEADER = "First name,Last name,Email";

function asAdmin() {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  sendEmail.mockClear();
  mockAdmin.rpc.mockResolvedValue({ data: "DM-2026-0001", error: null });
});

describe("POST /api/students/import", () => {
  it("403s a non-admin and 401s the signed-out", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "x" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    expect((await POST(req(`${HEADER}\nAda,Obi,a@b.com`))).status).toBe(403);

    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(req(`${HEADER}\nAda,Obi,a@b.com`))).status).toBe(401);
  });

  it("400s a file with no valid rows", async () => {
    asAdmin();
    expect((await POST(req("name,age\nAda,12"))).status).toBe(400);
  });

  it("creates an account per row and emails the login", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null }); // no existing email

    const res = await POST(req(`${HEADER}\nAda,Obi,ada@example.com\nBen,Ade,ben@example.com`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, created: 2 });

    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledTimes(2);
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ email: "ada@example.com", email_confirm: true }));
    expect(sendEmail).toHaveBeenCalledWith("credentials", "ada@example.com", expect.any(Object));
  });

  it("skips a learner who already has an account instead of duplicating", async () => {
    asAdmin();
    // First row's email exists; second doesn't.
    mockAdmin._qb.maybeSingle
      .mockResolvedValueOnce({ data: { id: "existing" }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(req(`${HEADER}\nAda,Obi,ada@example.com\nBen,Ade,ben@example.com`));
    const j = await res.json();
    expect(j.created).toBe(1);
    expect(j.skipped).toEqual([{ email: "ada@example.com", reason: "already has an account" }]);
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledTimes(1);
  });

  it("rolls back the login if the profile insert fails", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });
    mockAdmin._qb.insert.mockReturnValue(Promise.resolve({ error: { message: "profiles boom" } }) as any);
    mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: "new-1" } }, error: null });

    const res = await POST(req(`${HEADER}\nAda,Obi,ada@example.com`));
    const j = await res.json();
    expect(j.created).toBe(0);
    expect(j.skipped[0].reason).toMatch(/profiles boom/);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("new-1");
  });

  it("reports per-row parse errors alongside what was created", async () => {
    asAdmin();
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await POST(req(`${HEADER}\nAda,Obi,ada@example.com\nBad,,not-an-email`));
    const j = await res.json();
    expect(j.created).toBe(1);
    expect(j.rowErrors.length).toBeGreaterThan(0);
  });
});
