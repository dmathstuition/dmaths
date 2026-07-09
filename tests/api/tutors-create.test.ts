import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/siteUrl", () => ({ loginUrl: () => "https://dmaths.test/login" }));

import { POST } from "@/app/api/tutors/create/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/tutors/create", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  // Caller is an admin.
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
  // No pre-existing profile for the email by default.
  mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/tutors/create", () => {
  it("creates a tutor and returns copyable credentials", async () => {
    const res = await POST(req({ email: "t@x.com", firstName: "Mr", lastName: "T" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.created).toBe(true);
    expect(json.credentials.email).toBe("t@x.com");
    expect(json.credentials.tempPassword).toBeTruthy();
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "tutor", email: "t@x.com" }),
      expect.anything(),
    );
  });

  it("surfaces a clear message and rolls back when the tutor role is missing (migration not run)", async () => {
    mockAdmin._qb._setDirectResolve({ error: { message: 'invalid input value for enum user_role: "tutor"' } });
    const res = await POST(req({ email: "t@x.com", firstName: "Mr" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toMatch(/migration-tutor-portal\.sql/);
    // The auth user we just created is rolled back so the email stays reusable.
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("new-user-1");
  });

  it("reuses and resets an existing auth user instead of burning the email", async () => {
    mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: { message: "email address has already been registered" } });
    mockAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [{ id: "old-1", email: "t@x.com" }] }, error: null });

    const res = await POST(req({ email: "t@x.com", firstName: "Mr" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.created).toBe(false); // reused, not newly created
    expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith("old-1", expect.objectContaining({ email_confirm: true }));
  });

  it("refuses to hijack an email already used by a non-tutor account", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { id: "s-1", role: "student" }, error: null });
    const res = await POST(req({ email: "kid@x.com" }));
    expect(res.status).toBe(409);
  });

  it("403 for non-admins", async () => {
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    const res = await POST(req({ email: "t@x.com" }));
    expect(res.status).toBe(403);
  });
});
