import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockServer,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));

import { POST } from "@/app/api/applications/approve/route";
import { sendEmail } from "@/lib/email";

const PENDING_APP = {
  id: "app-1",
  status: "pending",
  email: "student@test.com",
  first_name: "Alice",
  last_name: "Smith",
  phone: "0800000000",
  dob: "2005-01-01",
  address: "123 Street",
  level: "JSS1",
  guardian_name: "Bob",
  guardian_contact: "0800000001",
  subjects: ["Maths"],
};

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/applications/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAdmin(appOverride: object = {}) {
  mockAdmin._qb.single
    .mockResolvedValueOnce({ data: { ...PENDING_APP, ...appOverride }, error: null }); // application fetch
}

function setupAuth(role = "admin") {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role }, error: null }); // profiles role check
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.mocked(sendEmail).mockResolvedValue(true);
});

describe("POST /api/applications/approve", () => {
  it("happy path: creates user, profile, marks approved, sends email", async () => {
    setupAuth("admin");
    setupAdmin();

    const res = await POST(makeRequest({ id: "app-1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.studentCode).toBeDefined();
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: PENDING_APP.email, email_confirm: true })
    );
    expect(mockAdmin._qb.insert).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      "credentials",
      PENDING_APP.email,
      expect.objectContaining({ email: PENDING_APP.email })
    );
  });

  it("returns 403 when the caller is not an admin", async () => {
    setupAuth("student");

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("forbidden");
  });

  it("returns 401 when the caller is unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the application does not exist", async () => {
    setupAuth("admin");
    mockAdmin._qb.single.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest({ id: "non-existent" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the application is already approved", async () => {
    setupAuth("admin");
    setupAdmin({ status: "approved" });

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("already reviewed");
  });

  it("returns 500 and skips profile insert if auth user creation fails", async () => {
    setupAuth("admin");
    setupAdmin();
    mockAdmin.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "email already exists" },
    });

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(500);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("rolls back the auth user when profile insert fails", async () => {
    setupAuth("admin");
    setupAdmin();
    // rpc (student code) succeeds; profile insert fails
    mockAdmin._qb._setDirectResolve({ error: { message: "unique constraint" } });
    // Make insert return error via the direct-await path
    mockAdmin._qb.insert.mockReturnValue({
      ...mockAdmin._qb,
      then(resolve: any, reject: any) {
        return Promise.resolve({ error: { message: "unique constraint" } }).then(resolve, reject);
      },
    });

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(500);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith("new-user-1");
  });

  it("still returns ok: true even when sendEmail fails", async () => {
    setupAuth("admin");
    setupAdmin();
    vi.mocked(sendEmail).mockResolvedValue(false);

    const res = await POST(makeRequest({ id: "app-1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns 400 when id is a number instead of a string", async () => {
    setupAuth("admin");

    const res = await POST(makeRequest({ id: 123 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("bad request");
  });
});
