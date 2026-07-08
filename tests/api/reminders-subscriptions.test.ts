import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

const notifyUser = vi.fn();
vi.mock("@/lib/notify", () => ({
  notifyUser: (...a: unknown[]) => notifyUser(...a),
}));

import { GET } from "@/app/api/reminders/subscriptions/route";

function req(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  notifyUser.mockReset();
  process.env.CRON_SECRET = "topsecret";
});

describe("GET /api/reminders/subscriptions", () => {
  it("401 without the secret", async () => {
    const res = await GET(req("https://dmaths.test/api/reminders/subscriptions"));
    expect(res.status).toBe(401);
  });

  it("accepts ?key= and reminds a due subscriber (student + linked parent)", async () => {
    // First awaited chain: the subscribers select; later chains: parent links.
    let call = 0;
    mockAdmin._qb.then = (resolve: any) => {
      call++;
      if (call === 1) {
        return Promise.resolve({
          data: [{ id: "stu-1", first_name: "Ada", sub_amount: 20000, sub_due_date: "2020-01-01", sub_reminded_at: null }],
          error: null,
        }).then(resolve);
      }
      return Promise.resolve({ data: [{ parent_id: "par-1" }], error: null }).then(resolve);
    };

    const res = await GET(req("https://dmaths.test/api/reminders/subscriptions?key=topsecret"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reminded).toBe(1);
    // learner + parent both nudged
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "stu-1", expect.objectContaining({ title: expect.stringContaining("overdue") }));
    expect(notifyUser).toHaveBeenCalledWith(expect.anything(), "par-1", expect.anything());
  });

  it("skips a subscriber nudged in the last 6 days", async () => {
    let call = 0;
    mockAdmin._qb.then = (resolve: any) => {
      call++;
      if (call === 1) {
        return Promise.resolve({
          data: [{ id: "stu-1", first_name: "Ada", sub_amount: 20000, sub_due_date: "2020-01-01", sub_reminded_at: new Date().toISOString() }],
          error: null,
        }).then(resolve);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve);
    };

    const res = await GET(req("https://dmaths.test/api/reminders/subscriptions?key=topsecret"));
    const json = await res.json();
    expect(json.reminded).toBe(0);
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
