import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockServer,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));

import { POST } from "@/app/api/students/delete/route";

const STUDENT = { first_name: "Alice", last_name: "Smith", email: "alice@example.com", role: "student" };

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/students/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("POST /api/students/delete", () => {
  it("deletes a student when name confirmation matches", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("stu-1");
  });

  it("also clears the learner's application and payment records (by email)", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("applications");
    expect(mockAdmin.from).toHaveBeenCalledWith("payments");
    expect(mockAdmin._qb.ilike).toHaveBeenCalledWith("email", "alice@example.com");
  });

  it("is case-insensitive for the confirmation name", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "ALICE SMITH" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when the confirmation name does not match", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "wrong name" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/does not match/i);
  });

  it("returns 400 when trying to delete an admin account", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: { ...STUDENT, role: "admin" }, error: null });

    const res = await POST(makeRequest({ studentId: "admin-target", confirmName: "alice smith" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cannot delete an admin/i);
  });

  it("returns 404 when the student does not exist", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ studentId: "ghost", confirmName: "nobody" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when studentId is missing", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(makeRequest({ confirmName: "alice smith" }));
    expect(res.status).toBe(400);
  });

  it("removes the profile first, then reports if the auth login can't be deleted", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });
    mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: { message: "Database error deleting user" } });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    // Profile is deleted before the auth call, so the student is gone from the app…
    expect(mockAdmin.from).toHaveBeenCalledWith("profiles");
    expect(mockAdmin._qb.delete).toHaveBeenCalled();
    // …and we surface the raw auth error rather than silently succeeding.
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/could not be fully deleted/i);
  });

  it("nulls out referral links pointing at the student before deleting", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(makeRequest({ studentId: "stu-1", confirmName: "alice smith" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledWith({ referred_by: null });
  });
});
