import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
let staff: any = { id: "tutor-1", role: "tutor" };
let roster: string[] = ["s1", "s2"];
let canAccessClass = true;

vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/authRole", () => ({
  requireStaff: vi.fn(async () => staff),
  getRoster: vi.fn(async () => roster),
  staffCanAccessClass: vi.fn(async () => canAccessClass),
}));

import { POST as manageClass } from "@/app/api/classes/manage/route";
import { POST as deleteClass } from "@/app/api/classes/delete/route";
import { POST as flashcards, DELETE as flashcardsDelete } from "@/app/api/flashcards/route";

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  staff = { id: "tutor-1", role: "tutor" };
  roster = ["s1", "s2"];
  canAccessClass = true;
});

const post = (url: string, b: any) =>
  new Request(`https://dmaths.test${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

const VALID_CLASS = { subject: "Algebra", startsAt: "2026-05-01T15:00:00.000Z", durationMinutes: 60 };

describe("classes/manage — tutor scoping", () => {
  it("403s a non-staff caller", async () => {
    staff = null;
    expect((await manageClass(post("/api/classes/manage", VALID_CLASS))).status).toBe(403);
  });

  it("400s without a subject or start time", async () => {
    const res = await manageClass(post("/api/classes/manage", { subject: "", startsAt: "" }));
    expect(res.status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("rejects a learner outside the tutor's roster", async () => {
    const res = await manageClass(post("/api/classes/manage", { ...VALID_CLASS, studentIds: ["s1", "intruder"] }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("pins the class to the tutor even if the body claims another tutor", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { first_name: "Ada", last_name: "O" }, error: null });
    mockAdmin._qb._setDirectResolve({ data: [{ id: "c-new" }] });
    const res = await manageClass(post("/api/classes/manage", { ...VALID_CLASS, tutorId: "someone-else", studentIds: ["s1"] }));
    expect(res.status).toBe(200);
    const inserted = mockAdmin._qb.insert.mock.calls[0][0];
    expect(inserted[0].tutor_id).toBe("tutor-1");
  });

  it("403s editing a class that isn't the tutor's", async () => {
    canAccessClass = false;
    const res = await manageClass(post("/api/classes/manage", { ...VALID_CLASS, classId: "not-mine" }));
    expect(res.status).toBe(403);
  });
});

describe("classes/delete — tutor scoping", () => {
  it("403s deleting someone else's class", async () => {
    canAccessClass = false;
    const res = await deleteClass(post("/api/classes/delete", { classId: "not-mine" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });
});

describe("flashcards — deck ownership", () => {
  it("403s a tutor publishing a deck they don't own", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { owner_id: "admin-9" }, error: null });
    const res = await flashcards(post("/api/flashcards", { action: "publish", deckId: "d1", published: true }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.update).not.toHaveBeenCalled();
  });

  it("403s a tutor deleting a deck they don't own", async () => {
    mockAdmin._qb.maybeSingle.mockResolvedValueOnce({ data: { owner_id: "admin-9" }, error: null });
    const res = await flashcardsDelete(new Request("https://dmaths.test/api/flashcards?deckId=d1", { method: "DELETE" }));
    expect(res.status).toBe(403);
    expect(mockAdmin._qb.delete).not.toHaveBeenCalled();
  });

  it("lets an admin manage any deck", async () => {
    staff = { id: "admin-1", role: "admin" };
    const res = await flashcardsDelete(new Request("https://dmaths.test/api/flashcards?deckId=d1", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.delete).toHaveBeenCalled();
  });
});
