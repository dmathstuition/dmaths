import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(async () => {}), notifyAdmins: vi.fn(async () => {}) }));
vi.mock("@/lib/authRole", () => ({ staffCanAccessStudent: vi.fn(async () => true) }));

import { POST } from "@/app/api/messages/send/route";
import { notifyAdmins } from "@/lib/notify";

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.clearAllMocks();
});

const post = (b: any) =>
  new Request("https://dmaths.test/api/messages/send", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
  });

function signedInAs(id: string, role: string) {
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  mockServer._qb.single.mockResolvedValue({ data: { role, first_name: "Ada" }, error: null });
  mockAdmin._qb.single.mockResolvedValue({ data: { id: "m1" }, error: null });
}

describe("messages/send — parent thread", () => {
  it("keys a parent's message to their OWN id, not their child's", async () => {
    signedInAs("parent-1", "parent");
    // Even if a child id is supplied, it must not become the thread key.
    const res = await POST(post({ body: "How is my son doing?", studentId: "child-1" }));
    expect(res.status).toBe(200);

    const row = mockAdmin._qb.insert.mock.calls[0][0];
    expect(row.student_id).toBe("parent-1");   // own thread — never the child's
    expect(row.sender_role).toBe("parent");
    expect(notifyAdmins).toHaveBeenCalled();
  });

  it("still rejects an unknown role", async () => {
    signedInAs("someone", "ghost");
    expect((await POST(post({ body: "hi" }))).status).toBe(403);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("rejects an empty message", async () => {
    signedInAs("parent-1", "parent");
    expect((await POST(post({ body: "   " }))).status).toBe(400);
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });
});
