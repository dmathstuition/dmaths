import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { GET } from "@/app/api/attendance/export/route";

const req = (qs: string) => new Request(`https://dmaths.test/api/attendance/export${qs}`);

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("GET /api/attendance/export", () => {
  it("403 for a non-admin", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    const res = await GET(req("?classId=c1"));
    expect(res.status).toBe(403);
  });

  it("400 when classId is missing", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("admin gets a CSV attachment", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: { subject: "Maths" }, error: null });
    mockAdmin._qb._setDirectResolve({ data: [], error: null });

    const res = await GET(req("?classId=c1&from=2026-08-03&to=2026-08-09"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attendance-Maths");
  });
});
