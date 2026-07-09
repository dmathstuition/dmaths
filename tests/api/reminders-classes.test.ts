import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
const notifyUser = vi.fn();
vi.mock("@/lib/notify", () => ({ notifyUser: (...a: unknown[]) => notifyUser(...a) }));

import { GET } from "@/app/api/reminders/classes/route";

const SECRET = "test-cron-secret";

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  // No upcoming classes → the route returns { reminded: 0, classes: 0 }.
  mockAdmin._qb._setDirectResolve({ data: [] });
  notifyUser.mockReset();
  process.env.CRON_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/reminders/classes auth", () => {
  it("authorizes via ?key= query param", async () => {
    const res = await GET(req(`https://dmaths.test/api/reminders/classes?key=${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reminded: 0, classes: 0 });
  });

  it("authorizes via Authorization: Bearer header", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/classes", { authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
  });

  it("trims stray whitespace on the secret", async () => {
    process.env.CRON_SECRET = `  ${SECRET}\n`;
    const res = await GET(req(`https://dmaths.test/api/reminders/classes?key=${SECRET}`));
    expect(res.status).toBe(200);
  });

  it("rejects a wrong key", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/classes?key=nope"));
    expect(res.status).toBe(401);
  });

  it("rejects when no secret is provided", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/classes"));
    expect(res.status).toBe(401);
  });

  it("rejects when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req(`https://dmaths.test/api/reminders/classes?key=${SECRET}`));
    expect(res.status).toBe(401);
  });

  it("reminds the assigned tutor about their own class", async () => {
    // One upcoming class assigned to tut-1 (the mock ignores query filters and
    // returns this for both the classes and roster reads).
    mockAdmin._qb._setDirectResolve({
      data: [{ id: "c1", subject: "Algebra", starts_at: new Date().toISOString(), link: "", tutor_id: "tut-1" }],
    });
    const res = await GET(req(`https://dmaths.test/api/reminders/classes?key=${SECRET}`));
    expect(res.status).toBe(200);
    expect(notifyUser).toHaveBeenCalledWith(
      expect.anything(), "tut-1", expect.objectContaining({ link: "/tutor/classes" }),
    );
  });
});
