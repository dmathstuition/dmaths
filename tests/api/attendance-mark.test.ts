import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let canAccess = true;
let staff: any = { id: "tutor-1", role: "tutor" };

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/authRole", () => ({
  requireStaff: vi.fn(async () => staff),
  staffCanAccessClass: vi.fn(async () => canAccess),
}));

import { POST } from "@/app/api/attendance/mark/route";

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  canAccess = true;
  staff = { id: "tutor-1", role: "tutor" };
});

const post = (b: any) =>
  new Request("https://dmaths.test/api/attendance/mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
const VALID = { classId: "c1", studentId: "s1", sessionDate: "2026-01-10", present: true };

describe("attendance/mark", () => {
  it("403s when the caller isn't staff", async () => {
    staff = null;
    expect((await POST(post(VALID))).status).toBe(403);
  });

  it("400s on missing fields (no upsert)", async () => {
    const res = await POST(post({ classId: "c1" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.upsert).not.toHaveBeenCalled();
  });

  it("403s when the class isn't the tutor's (no upsert)", async () => {
    canAccess = false;
    const res = await POST(post(VALID));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.upsert).not.toHaveBeenCalled();
  });

  it("upserts an attendance record on success", async () => {
    const res = await POST(post(VALID));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.upsert).toHaveBeenCalledTimes(1);
  });
});
