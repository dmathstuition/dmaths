import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let staff: any = { id: "admin-1", role: "admin" };

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/authRole", () => ({
  requireStaff: vi.fn(async () => staff),
  staffCanAccessStudent: vi.fn(async () => true),
}));
vi.mock("@/lib/broadcast", () => ({ resolveRecipientIds: vi.fn(async () => ["s1", "s2"]) }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(async () => {}) }));

import { POST as create } from "@/app/api/daily-tasks/route";
import { POST as complete } from "@/app/api/daily-tasks/complete/route";

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  mockServer = makeMockSupabaseClient();
  staff = { id: "admin-1", role: "admin" };
});

const post = (url: string, b: any) =>
  new Request(`https://dmaths.test${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

describe("daily-tasks create", () => {
  it("403s a non-staff caller", async () => {
    staff = null;
    expect((await create(post("/api/daily-tasks", { type: "student", value: "s1", title: "x" }))).status).toBe(403);
  });

  it("400s without a title (no insert)", async () => {
    const res = await create(post("/api/daily-tasks", { type: "student", value: "s1", title: "" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("posts a task to one learner", async () => {
    const res = await create(post("/api/daily-tasks", { type: "student", value: "s1", title: "Read chapter 4" }));
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(1);
    expect(mockAdmin._qb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("daily-tasks complete", () => {
  function asUser(id: string) {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  }
  it("403s completing someone else's task", async () => {
    asUser("intruder");
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { id: "t1", student_id: "owner", done: false }, error: null });
    const res = await complete(post("/api/daily-tasks/complete", { id: "t1" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });
  it("marks the owner's task done", async () => {
    asUser("owner");
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { id: "t1", student_id: "owner", done: false }, error: null });
    const res = await complete(post("/api/daily-tasks/complete", { id: "t1", response: "did it" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.update).toHaveBeenCalledTimes(1);
  });
});
