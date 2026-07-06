import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(), notifyAdmins: vi.fn() }));
vi.mock("@/lib/siteUrl", () => ({ loginUrl: () => "https://dmaths.test/login" }));

import { GET } from "@/app/api/reminders/weekly-digest/route";

const req = (url: string) => new Request(url);

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  mockAdmin._qb._setDirectResolve({ data: [] });
  process.env.CRON_SECRET = "s3cret";
});
afterEach(() => { delete process.env.CRON_SECRET; });

describe("GET /api/reminders/weekly-digest", () => {
  it("rejects without the secret", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/weekly-digest"));
    expect(res.status).toBe(401);
  });

  it("authorizes via ?key= and returns counts", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/weekly-digest?key=s3cret"));
    expect(res.status).toBe(200);
    expect((await res.json())).toMatchObject({ ok: true, pushed: 0 });
  });

  it("authorizes via Bearer header", async () => {
    const res = await GET(new Request("https://dmaths.test/api/reminders/weekly-digest", {
      headers: { authorization: "Bearer s3cret" },
    }));
    expect(res.status).toBe(200);
  });
});
