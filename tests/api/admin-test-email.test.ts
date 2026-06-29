import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));

const sendEmailResult = vi.fn();
vi.mock("@/lib/email", () => ({ sendEmailResult: (...a: unknown[]) => sendEmailResult(...a) }));
vi.mock("@/lib/siteUrl", () => ({ loginUrl: () => "https://dmaths.test/login" }));

import { POST } from "@/app/api/admin/test-email/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/admin/test-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  sendEmailResult.mockReset();
});

describe("POST /api/admin/test-email", () => {
  it("sends and returns the relay result for an admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    sendEmailResult.mockResolvedValue({ ok: true });

    const res = await POST(req({ to: "owner@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendEmailResult).toHaveBeenCalledWith("notice", "owner@example.com", expect.any(Object));
  });

  it("surfaces the relay error verbatim", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    sendEmailResult.mockResolvedValue({ ok: false, error: "unauthorized" });

    const res = await POST(req({ to: "owner@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("rejects a non-admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(req({ to: "owner@example.com" }));
    expect(res.status).toBe(403);
    expect(sendEmailResult).not.toHaveBeenCalled();
  });

  it("400s on a bad address", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(req({ to: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});
