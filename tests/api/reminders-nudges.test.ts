import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(async () => {}) }));

import { GET } from "@/app/api/reminders/nudges/route";
import { notifyUser } from "@/lib/notify";
import { STREAK_TITLE } from "@/lib/nudges";

const KEY = "test-cron-secret";
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

// A learner whose streak is about to break → always a nudge candidate.
const CANDIDATE = { id: "s1", streak_count: 4, streak_last_date: yesterday() };

function req(key = KEY) {
  return new Request(`https://dmaths.test/api/reminders/nudges?key=${key}`);
}

// The route runs two selects: profiles (candidates), then notifications
// (who already got one today). Queue their results in that order.
function stubQueries(profiles: any[], alreadySent: any[]) {
  const results = [{ data: profiles, error: null }, { data: alreadySent, error: null }];
  let i = 0;
  mockAdmin._qb.then = (resolve: any) => Promise.resolve(results[i++] ?? { data: [], error: null }).then(resolve);
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  process.env.CRON_SECRET = KEY;
  vi.clearAllMocks();
});

describe("reminders/nudges", () => {
  it("401s without the cron key", async () => {
    const res = await GET(req("wrong"));
    expect(res.status).toBe(401);
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("nudges a qualifying learner who hasn't been nudged today", async () => {
    stubQueries([CANDIDATE], []);
    const res = await GET(req());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(notifyUser).toHaveBeenCalledTimes(1);
  });

  it("does NOT re-nudge someone already nudged today (the spam bug)", async () => {
    stubQueries([CANDIDATE], [{ user_id: "s1", title: STREAK_TITLE }]);
    const res = await GET(req());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it("sends nothing when nobody qualifies", async () => {
    stubQueries([{ id: "s2", streak_count: 5, streak_last_date: new Date().toISOString().slice(0, 10) }], []);
    const res = await GET(req());
    expect((await res.json()).sent).toBe(0);
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
