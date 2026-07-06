import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const notifyAdmins = vi.fn();
vi.mock("@/lib/notify", () => ({
  notifyAdmins: (...a: unknown[]) => notifyAdmins(...a),
}));

import { POST } from "@/app/api/ratings/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  mockAdmin._qb.insert.mockResolvedValue({ data: null, error: null });
  notifyAdmins.mockReset();
});

describe("POST /api/ratings", () => {
  it("stores a student rating and alerts admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });

    const res = await POST(req({ stars: 5, comment: "Love it!" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("ratings");
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "stu-1", role: "student", stars: 5, comment: "Love it!" }),
    );
    expect(notifyAdmins).toHaveBeenCalled();
  });

  it("rejects an out-of-range rating", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });

    const res = await POST(req({ stars: 7 }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("forbids a non-student/parent (e.g. admin) from rating", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin", first_name: "Sir" }, error: null });

    const res = await POST(req({ stars: 4 }));
    expect(res.status).toBe(403);
  });

  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ stars: 4 }));
    expect(res.status).toBe(401);
  });
});
