import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST } from "@/app/api/push/subscribe/route";

const SUB = {
  endpoint: "https://push.example.com/abc",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

function makeRequest(body: unknown) {
  return new Request("https://dmaths.test/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "vitest" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("POST /api/push/subscribe", () => {
  it("stores the subscription for the signed-in user", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });

    const res = await POST(makeRequest(SUB));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(mockAdmin.from).toHaveBeenCalledWith("push_subscriptions");
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "stu-1", endpoint: SUB.endpoint, p256dh: "p256dh-key", auth: "auth-key" }),
      { onConflict: "endpoint" },
    );
  });

  it("returns 401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest(SUB));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid subscription", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    const res = await POST(makeRequest({ endpoint: "x" })); // missing keys
    expect(res.status).toBe(400);
  });
});
