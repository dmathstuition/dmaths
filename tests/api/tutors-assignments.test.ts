import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "@/app/api/tutors/assignments/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/tutors/assignments", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
});

describe("POST /api/tutors/assignments", () => {
  it("creates an assignment only for the tutor's own roster learners", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    mockAdmin._qb.single.mockResolvedValue({ data: { id: "a1" }, error: null });
    // Roster (direct-await) contains only stu-1.
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "stu-1", id: "c1" }] });

    const res = await POST(req({ title: "Homework 1", subject: "Maths", studentIds: ["stu-1", "outsider"] }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.count).toBe(1); // "outsider" filtered out
    // Submission stubs inserted only for the in-roster learner.
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith([{ assignment_id: "a1", student_id: "stu-1" }]);
  });

  it("rejects when none of the chosen learners are in the tutor's roster", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    // Empty roster (default direct-await → null).
    const res = await POST(req({ title: "Homework 1", studentIds: ["outsider"] }));
    expect(res.status).toBe(400);
  });

  it("requires a title", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    const res = await POST(req({ studentIds: ["stu-1"] }));
    expect(res.status).toBe(400);
  });

  it("403 for non-staff", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    const res = await POST(req({ title: "x", studentIds: ["stu-1"] }));
    expect(res.status).toBe(403);
  });
});
