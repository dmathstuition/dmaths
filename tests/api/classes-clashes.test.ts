import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let staff: any = { id: "tutor-1", role: "tutor" };

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/authRole", () => ({
  requireStaff: vi.fn(async () => staff),
  getRoster: vi.fn(async () => ["s1", "s2"]),
  staffCanAccessClass: vi.fn(async () => true),
}));

const detectClashes = vi.fn();
vi.mock("@/lib/clashLookup", () => ({ detectClashes: (...a: unknown[]) => detectClashes(...a) }));

import { POST as manageClass } from "@/app/api/classes/manage/route";
import { POST as checkClashes } from "@/app/api/classes/clashes/route";

const post = (url: string, b: any) =>
  new Request(`https://dmaths.test${url}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
  });

const VALID = { subject: "Algebra", startsAt: "2026-05-01T15:00:00.000Z", durationMinutes: 60 };
const CLASH = [{ kind: "tutor", classId: "c9", subject: "English", startsAt: "2026-05-01T15:00:00.000Z", studentIds: [], when: "2026-05-01T15:00:00.000Z" }];

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  staff = { id: "tutor-1", role: "tutor" };
  detectClashes.mockReset().mockResolvedValue([]);
});

describe("classes/manage — double booking", () => {
  it("refuses with 409 and names the clash instead of writing", async () => {
    detectClashes.mockResolvedValue(CLASH);

    const res = await manageClass(post("/api/classes/manage", VALID));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ needsConfirm: true, clashes: CLASH });
    // Nothing was written — the clash check runs before any insert.
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  // The scheduler may know the clash is fine; the warning must be overridable.
  it("goes ahead when the caller confirms", async () => {
    detectClashes.mockResolvedValue(CLASH);

    const res = await manageClass(post("/api/classes/manage", { ...VALID, confirm: true }));
    expect(res.status).toBe(200);
    expect(detectClashes).not.toHaveBeenCalled();
  });

  it("checks every occurrence of a weekly series, not just the first", async () => {
    await manageClass(post("/api/classes/manage", { ...VALID, repeatWeekly: true, repeatWeeks: 4 }));
    const slots = detectClashes.mock.calls[0][1];
    expect(slots).toHaveLength(4);
    expect(slots[3].startsAt).toBe("2026-05-22T15:00:00.000Z"); // three weeks on
  });

  it("excludes the class being edited from its own clash check", async () => {
    await manageClass(post("/api/classes/manage", { ...VALID, classId: "c1" }));
    expect(detectClashes.mock.calls[0][2]).toEqual(["c1"]);
  });

  it("creates normally when the slot is free", async () => {
    const res = await manageClass(post("/api/classes/manage", VALID));
    expect(res.status).toBe(200);
    expect(detectClashes).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/classes/clashes", () => {
  it("403s a non-staff caller", async () => {
    staff = null;
    expect((await checkClashes(post("/api/classes/clashes", VALID))).status).toBe(403);
  });

  it("400s on a start time it can't read", async () => {
    expect((await checkClashes(post("/api/classes/clashes", { startsAt: "soon" }))).status).toBe(400);
  });

  it("returns the clashes it finds", async () => {
    detectClashes.mockResolvedValue(CLASH);
    const res = await checkClashes(post("/api/classes/clashes", { ...VALID, weeks: 2 }));
    await expect(res.json()).resolves.toEqual({ clashes: CLASH });
    expect(detectClashes.mock.calls[0][1]).toHaveLength(2);
  });

  // A tutor can only ever be checking their own timetable.
  it("pins a tutor to themselves however they ask", async () => {
    await checkClashes(post("/api/classes/clashes", { ...VALID, tutorId: "someone-else" }));
    expect(detectClashes.mock.calls[0][1][0].tutorId).toBe("tutor-1");
  });

  it("lets an admin check on behalf of any tutor", async () => {
    staff = { id: "admin-1", role: "admin" };
    await checkClashes(post("/api/classes/clashes", { ...VALID, tutorId: "tutor-7" }));
    expect(detectClashes.mock.calls[0][1][0].tutorId).toBe("tutor-7");
  });
});
