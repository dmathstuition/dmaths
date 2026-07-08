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

import { POST } from "@/app/api/account/delete/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const STUDENT = { role: "student", first_name: "Ada", last_name: "Obi", email: "ada@example.com", student_code: "DM-2026-0001" };

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  notifyAdmins.mockReset();
});

describe("POST /api/account/delete", () => {
  it("lets a student permanently delete their own account", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(200);
    // The full learner-deletion machinery ran against THEIR OWN id…
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("stu-1");
    expect(mockAdmin.from).toHaveBeenCalledWith("profiles");
    // …their application/payment rows were matched by email…
    expect(mockAdmin._qb.ilike).toHaveBeenCalledWith("email", "ada@example.com");
    // …and the school was told.
    expect(notifyAdmins).toHaveBeenCalled();
  });

  it("lets a parent delete their own account", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "par-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({
      data: { role: "parent", first_name: "Mrs", last_name: "Obi", email: "mum@example.com", student_code: null },
      error: null,
    });

    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("par-1");
    expect(mockAdmin.from).toHaveBeenCalledWith("parent_student_links");
  });

  it("rejects without the typed DELETE confirmation", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: STUDENT, error: null });

    const res = await POST(req({ confirm: "yes please" }));
    expect(res.status).toBe(400);
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("forbids admin accounts from self-deleting", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "adm-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { ...STUDENT, role: "admin" }, error: null });

    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(403);
    expect(mockAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ confirm: "DELETE" }));
    expect(res.status).toBe(401);
  });
});
