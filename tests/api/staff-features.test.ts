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

import { GET as attendanceList } from "@/app/api/attendance/list/route";
import { POST as lessonPost } from "@/app/api/lesson-notes/route";

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  canAccess = true;
  staff = { id: "tutor-1", role: "tutor" };
});

const get = (p: string) => new Request(`https://dmaths.test${p}`);
const post = (p: string, b: any) =>
  new Request(`https://dmaths.test${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

describe("attendance/list — tutor scoping", () => {
  it("403s when the class isn't the tutor's", async () => {
    canAccess = false;
    const res = await attendanceList(get("/api/attendance/list?classId=c1&date=2026-01-01"));
    expect(res.status).toBe(403);
  });

  it("403s when the caller isn't staff", async () => {
    staff = null;
    const res = await attendanceList(get("/api/attendance/list?classId=c1&date=2026-01-01"));
    expect(res.status).toBe(403);
  });

  it("returns records for an accessible class", async () => {
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "s1", present: true, late: false }] });
    const res = await attendanceList(get("/api/attendance/list?classId=c1&date=2026-01-01"));
    expect(res.status).toBe(200);
    expect((await res.json()).records).toHaveLength(1);
  });
});

describe("lesson-notes POST", () => {
  it("requires a class and topic", async () => {
    const res = await lessonPost(post("/api/lesson-notes", { classId: "", topic: "" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("403s when the class isn't accessible", async () => {
    canAccess = false;
    const res = await lessonPost(post("/api/lesson-notes", { classId: "c1", topic: "Algebra" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("inserts a valid lesson entry", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { subject: "Maths" }, error: null }); // class subject
    mockAdmin._qb.single.mockResolvedValueOnce({ data: { id: "note-1" }, error: null });          // inserted row
    const res = await lessonPost(post("/api/lesson-notes", { classId: "c1", topic: "Algebra", notes: "went well" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).toHaveBeenCalledTimes(1);
  });
});
