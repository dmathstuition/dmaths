import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";
import "../mocks/server";

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

import { POST } from "@/app/api/assignments/grade/route";

const MOCK_SUBMISSION = {
  assignment: { title: "Test Assignment", subject: "Maths" },
  student: { first_name: "Alice", email: "student@test.com" },
};

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/assignments/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAdminAsAdmin() {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
  mockAdmin._qb.single.mockResolvedValue({ data: MOCK_SUBMISSION, error: null });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("POST /api/assignments/grade", () => {
  it("returns 200 for a valid grade and feedback", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: 75, feedback: "Good work" }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns 400 when grade is below 0", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: -1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/0-100/);
  });

  it("returns 400 when grade is above 100", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: 101 }));
    expect(res.status).toBe(400);
  });

  it("allows grade = 0", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: 0 }));
    expect(res.status).toBe(200);
  });

  it("allows grade = 100", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: 100 }));
    expect(res.status).toBe(200);
  });

  it("coerces a string grade '75' to 75", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: "75" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for a non-numeric string grade", async () => {
    setupAdminAsAdmin();
    const res = await POST(makeRequest({ submissionId: "sub-1", grade: "abc" }));
    expect(res.status).toBe(400);
  });

  it("truncates feedback longer than 2000 characters", async () => {
    setupAdminAsAdmin();
    const longFeedback = "x".repeat(3000);
    await POST(makeRequest({ submissionId: "sub-1", grade: 80, feedback: longFeedback }));

    const updateCall = vi.mocked(mockAdmin._qb.update).mock.calls[0];
    const payload = updateCall?.[0] as any;
    expect(payload?.feedback?.length).toBe(2000);
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(makeRequest({ submissionId: "sub-1", grade: 80 }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when submissionId is missing", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(makeRequest({ grade: 80 }));
    expect(res.status).toBe(400);
  });
});
