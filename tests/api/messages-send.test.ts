import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const notifyUser = vi.fn();
const notifyAdmins = vi.fn();
vi.mock("@/lib/notify", () => ({
  notifyUser: (...a: unknown[]) => notifyUser(...a),
  notifyAdmins: (...a: unknown[]) => notifyAdmins(...a),
}));

import { POST } from "@/app/api/messages/send/route";

function req(body: unknown) {
  return new Request("https://dmaths.test/api/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  mockAdmin._qb.single.mockResolvedValue({ data: { id: "msg-1" }, error: null });
  notifyUser.mockReset();
  notifyAdmins.mockReset();
});

describe("POST /api/messages/send", () => {
  it("admin sends to a learner and alerts the learner", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin", first_name: "Sir" }, error: null });

    const res = await POST(req({ studentId: "stu-1", body: "Hello there" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("messages");
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "stu-1", sender_id: "admin-1", sender_role: "admin", body: "Hello there" }),
    );
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "stu-1", expect.objectContaining({ link: "/portal/messages" }));
  });

  it("learner replies into their own thread and alerts admins", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });

    const res = await POST(req({ body: "Thanks!" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "stu-1", sender_id: "stu-1", sender_role: "student", body: "Thanks!" }),
    );
    expect(notifyAdmins).toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("rejects an admin send with no studentId", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin", first_name: "Sir" }, error: null });

    const res = await POST(req({ body: "hi" }));
    expect(res.status).toBe(400);
  });

  it("rejects an empty message", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });

    const res = await POST(req({ body: "   " }));
    expect(res.status).toBe(400);
  });

  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ body: "hi" }));
    expect(res.status).toBe(401);
  });

  it("tutor sends into their own thread and alerts admins (link → /admin/tutors)", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor", first_name: "Mr T" }, error: null });

    const res = await POST(req({ body: "Morning admin" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "tut-1", sender_id: "tut-1", sender_role: "student", body: "Morning admin" }),
    );
    expect(notifyAdmins).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ link: "/admin/tutors?t=tut-1" }));
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("admin sends to a tutor and points them at the tutor portal", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "admin", first_name: "Sir" }, error: null });
    // Recipient role lookup (admin.from('profiles').maybeSingle()) → tutor.
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { role: "tutor" }, error: null });

    const res = await POST(req({ studentId: "tut-1", body: "Please cover Friday" }));
    expect(res.status).toBe(200);
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "tut-1", expect.objectContaining({ link: "/tutor/messages" }));
  });

  it("tutor messages a learner in their roster (learner↔tutor thread)", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor", first_name: "Mr T" }, error: null });
    // staffCanAccessStudent → getRoster contains stu-1.
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "stu-1", id: "c1" }] });

    const res = await POST(req({ studentId: "stu-1", body: "Great work today" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "stu-1", tutor_id: "tut-1", sender_role: "tutor", body: "Great work today" }),
    );
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "stu-1", expect.objectContaining({ link: "/portal/messages" }));
  });

  it("blocks a tutor messaging a learner outside their roster", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "tut-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor", first_name: "Mr T" }, error: null });
    // Empty roster → not allowed.
    const res = await POST(req({ studentId: "outsider", body: "hi" }));
    expect(res.status).toBe(403);
  });

  it("learner messages their tutor (learner↔tutor thread)", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });
    // staffCanAccessStudent(tutor=tut-1, learner=stu-1): roster contains stu-1.
    mockAdmin._qb._setDirectResolve({ data: [{ student_id: "stu-1", id: "c1" }] });

    const res = await POST(req({ tutorId: "tut-1", body: "Thanks!" }));
    expect(res.status).toBe(200);
    expect(mockAdmin._qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: "stu-1", tutor_id: "tut-1", sender_role: "student", body: "Thanks!" }),
    );
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "tut-1", expect.objectContaining({ link: "/tutor/learners/stu-1" }));
  });

  it("blocks a learner messaging a tutor who isn't theirs", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
    mockServer._qb.single.mockResolvedValue({ data: { role: "student", first_name: "Ada" }, error: null });
    // Empty roster for the target tutor → not one of the learner's tutors.
    const res = await POST(req({ tutorId: "stranger", body: "hi" }));
    expect(res.status).toBe(403);
  });
});
