import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST } from "@/app/api/notebooks/share/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/notebooks/share", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("POST /api/notebooks/share", () => {
  it("401 when signed out", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ snippetId: "n1", shared: true }));
    expect(res.status).toBe(401);
  });

  it("403 for a learner", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });
    const res = await POST(req({ snippetId: "n1", shared: true }));
    expect(res.status).toBe(403);
  });

  it("a tutor shares their own notebook", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor", first_name: "Mr", last_name: "T" }, error: null });
    // Ownership lookup on the admin client → tutor owns it, and it's a notebook.
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "n1", user_id: "tut-1", language: "notebook" }, error: null });
    mockAdmin._qb._setDirectResolve({ error: null });

    const res = await POST(req({ snippetId: "n1", shared: true }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith(
      expect.objectContaining({ shared: true, shared_by_name: "Mr T" }),
    );
  });

  it("blocks sharing a notebook you don't own", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor", first_name: "Mr", last_name: "T" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "n1", user_id: "someone-else", language: "notebook" }, error: null });

    const res = await POST(req({ snippetId: "n1", shared: true }));
    expect(res.status).toBe(404);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });
});
