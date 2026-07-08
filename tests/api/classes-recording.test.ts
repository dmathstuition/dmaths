import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const notifyUser = vi.fn();
vi.mock("@/lib/notify", () => ({
  notifyUser: (...a: unknown[]) => notifyUser(...a),
}));

import { POST } from "@/app/api/classes/recording/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/classes/recording", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

describe("POST /api/classes/recording", () => {
  it("saves a recording link and notifies the roster", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "cls-1", subject: "Algebra" }, error: null });
    // roster fetch resolves via direct-await on the chain
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "stu-1" }, { student_id: "stu-2" }] });

    const res = await POST(req({ classId: "cls-1", url: "https://youtu.be/abc" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith({ recording_url: "https://youtu.be/abc" });
    expect(notifyUser).toHaveBeenCalledTimes(2);
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "stu-1",
      expect.objectContaining({ link: "/portal/classes" }));
  });

  it("clearing the link does not notify anyone", async () => {
    asAdmin();
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "cls-1", subject: "Algebra" }, error: null });

    const res = await POST(req({ classId: "cls-1", url: "" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith({ recording_url: "" });
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("rejects a non-http link", async () => {
    asAdmin();
    const res = await POST(req({ classId: "cls-1", url: "youtube.com/abc" }));
    expect(res.status).toBe(400);
  });

  it("403 for non-admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    const res = await POST(req({ classId: "cls-1", url: "https://x.com/v" }));
    expect(res.status).toBe(403);
  });

  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ classId: "cls-1", url: "https://x.com/v" }));
    expect(res.status).toBe(401);
  });
});
