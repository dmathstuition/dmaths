import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const notifyUser = vi.fn();
vi.mock("@/lib/notify", () => ({ notifyUser: (...a: unknown[]) => notifyUser(...a) }));

import { POST } from "@/app/api/classes/live/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/classes/live", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  notifyUser.mockReset();
});

function asAdmin() {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
}

describe("POST /api/classes/live", () => {
  it("going live flags the class and alerts the roster", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "cls-1", subject: "Algebra", live_since: null }, error: null });
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "stu-1" }, { student_id: "stu-2" }], error: null });

    const res = await POST(req({ classId: "cls-1", live: true }));
    expect(res.status).toBe(200);
    // live_since gets a timestamp
    const update = mockAdmin._qb.update.mock.calls[0][0];
    expect(update.live_since).toBeTruthy();
    expect(notifyUser).toHaveBeenCalledTimes(2);
  });

  it("a heartbeat (already live) does not re-notify", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "cls-1", subject: "Algebra", live_since: new Date().toISOString() }, error: null });
    mockAdmin._qb._setDirectResolve({ error: null });

    const res = await POST(req({ classId: "cls-1", live: true }));
    expect(res.status).toBe(200);
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("leaving clears the flag and notifies no one", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "cls-1", subject: "Algebra", live_since: new Date().toISOString() }, error: null });
    mockAdmin._qb._setDirectResolve({ error: null });

    const res = await POST(req({ classId: "cls-1", live: false }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith({ live_since: null });
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("403 for a learner", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    const res = await POST(req({ classId: "cls-1", live: true }));
    expect(res.status).toBe(403);
  });
});
