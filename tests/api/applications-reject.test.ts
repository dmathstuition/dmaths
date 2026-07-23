import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST } from "@/app/api/applications/reject/route";
import { sendEmail } from "@/lib/email";

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.clearAllMocks();
});

const post = (b: any) =>
  new Request("https://dmaths.test/api/applications/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

function auth(role: string) {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role }, error: null });
}

describe("applications/reject", () => {
  it("403s a non-admin", async () => {
    auth("student");
    const res = await POST(post({ id: "app-1" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });

  it("404s when the application is missing", async () => {
    auth("admin");
    mockAdmin._qb.single.mockResolvedValueOnce({ data: null, error: null });
    const res = await POST(post({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("rejects the application and emails the applicant", async () => {
    auth("admin");
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { email: "a@b.com", first_name: "Ada" }, error: null });
    const res = await POST(post({ id: "app-1", reason: "Incomplete payment" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith("rejected", "a@b.com", expect.objectContaining({ reason: "Incomplete payment" }));
  });
});
