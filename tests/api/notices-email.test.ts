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

import { POST } from "@/app/api/notices/email/route";
import { sendEmail } from "@/lib/email";

const NOTICE = { id: "notice-1", title: "School Closure", body: "Closed tomorrow.", target: "all", emailed_at: null };
const STUDENTS = [
  { email: "a@test.com", first_name: "Alice", subjects: ["Maths"] },
  { email: "b@test.com", first_name: "Bob", subjects: ["English"] },
];

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/notices/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupHappyPath(noticeOverride: object = {}, studentsOverride = STUDENTS) {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
  mockAdmin._qb.single.mockResolvedValue({ data: { ...NOTICE, ...noticeOverride }, error: null });
  // Override the students query (non-single)
  mockAdmin._qb._setDirectResolve({ data: studentsOverride });
  // For the students list, the route uses await without .single()
  mockAdmin.from.mockImplementation((table: string) => {
    if (table === "notices") return { ...mockAdmin._qb, single: vi.fn().mockResolvedValue({ data: { ...NOTICE, ...noticeOverride }, error: null }) };
    if (table === "profiles") {
      const studentsBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any, reject: any) => Promise.resolve({ data: studentsOverride, error: null }).then(resolve, reject),
      };
      return studentsBuilder;
    }
    return mockAdmin._qb;
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.mocked(sendEmail).mockResolvedValue(true);
});

describe("POST /api/notices/email", () => {
  it("sends emails to all active students and returns sent count", async () => {
    setupHappyPath();
    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(2);
    expect(json.failed).toBe(0);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("counts failed sends in the response", async () => {
    setupHappyPath();
    vi.mocked(sendEmail)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    const json = await res.json();
    expect(json.sent).toBe(1);
    expect(json.failed).toBe(1);
  });

  it("returns 400 when the notice was already emailed", async () => {
    setupHappyPath({ emailed_at: new Date().toISOString() });
    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already emailed/i);
  });

  it("returns 400 when there are no matching recipients", async () => {
    setupHappyPath({}, []);
    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no matching/i);
  });

  it("returns 400 when the recipient count exceeds 80", async () => {
    const manyStudents = Array.from({ length: 81 }, (_, i) => ({
      email: `s${i}@test.com`,
      first_name: `Student${i}`,
      subjects: ["Maths"],
    }));
    setupHappyPath({}, manyStudents);

    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/exceeds/i);
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });

    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest({ noticeId: "notice-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when noticeId is missing", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/noticeId/i);
  });
});
