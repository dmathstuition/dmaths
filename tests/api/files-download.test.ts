import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const staffCanAccessStudent = vi.fn();
vi.mock("@/lib/authRole", () => ({
  staffCanAccessStudent: (...a: unknown[]) => staffCanAccessStudent(...a),
}));

import { GET } from "@/app/api/files/download/route";

const SUB_URL = "https://xyz.supabase.co/storage/v1/object/public/submissions/sub-1/1700-ab.png";
const VOICE_URL = "https://xyz.supabase.co/storage/v1/object/public/voice-notes/stu-1/1700.webm";
const PUBLIC_URL = "https://xyz.supabase.co/storage/v1/object/public/materials/algebra/notes.pdf";

const req = (u: string) =>
  new Request(`https://dmaths.test/api/files/download?u=${encodeURIComponent(u)}`);

function signedIn(id: string, role: string) {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role }, error: null });
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  staffCanAccessStudent.mockReset().mockResolvedValue(false);
});

describe("GET /api/files/download", () => {
  it("refuses a signed-out caller", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(401);
    expect(mockAdmin._storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects anything that isn't a storage object (no signing oracle)", async () => {
    const res = await GET(req("https://evil.example.com/secrets.txt"));
    expect(res.status).toBe(400);
    expect(mockAdmin._storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("passes public teaching content straight through without signing", async () => {
    const res = await GET(req(PUBLIC_URL));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(PUBLIC_URL);
    expect(mockAdmin._storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs a learner's own submission for them", async () => {
    signedIn("stu-1", "student");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1" }, error: null });

    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(307);
    expect(mockAdmin.storage.from).toHaveBeenCalledWith("submissions");
    expect(mockAdmin._storage.createSignedUrl).toHaveBeenCalledWith("sub-1/1700-ab.png", 300);
    // The redirect must never be cached — the signature is short-lived.
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses another learner's submission", async () => {
    signedIn("stu-2", "student");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1" }, error: null });

    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(403);
    expect(mockAdmin._storage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("refuses a tutor who doesn't have that learner on their roster", async () => {
    signedIn("tut-9", "tutor");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1" }, error: null });
    staffCanAccessStudent.mockResolvedValue(false);

    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(403);
  });

  it("allows a tutor who does", async () => {
    signedIn("tut-9", "tutor");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1" }, error: null });
    staffCanAccessStudent.mockResolvedValue(true);

    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(307);
    expect(staffCanAccessStudent).toHaveBeenCalledWith({ id: "tut-9", role: "tutor" }, "stu-1");
  });

  it("refuses a file with no owning row at all (an unreferenced object)", async () => {
    signedIn("stu-1", "student");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await GET(req(SUB_URL));
    expect(res.status).toBe(403);
  });

  it("lets someone play back their own voice note", async () => {
    signedIn("stu-1", "student");
    // Path is under their own id — no message lookup needed.
    const res = await GET(req(VOICE_URL));
    expect(res.status).toBe(307);
    expect(mockAdmin.storage.from).toHaveBeenCalledWith("voice-notes");
  });

  it("lets the other party in the thread play it, and nobody else", async () => {
    signedIn("adm-1", "admin");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1", tutor_id: null }, error: null });
    expect((await GET(req(VOICE_URL))).status).toBe(307);

    signedIn("stu-7", "student");
    mockAdmin._qb.maybeSingle.mockResolvedValue({ data: { student_id: "stu-1", tutor_id: null }, error: null });
    expect((await GET(req(VOICE_URL))).status).toBe(403);
  });
});
