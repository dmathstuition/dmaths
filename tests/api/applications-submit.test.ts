import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: () => mockAdmin }));

import { POST } from "@/app/api/applications/submit/route";

const VALID = {
  first_name: "Ada", last_name: "Obi", email: "a@b.com", phone: "08000000000",
  subjects: ["Maths"],
};

// Distinct IP per request so the (real, in-memory) rate limiter never interferes.
function makeReq(body: object, ip: string) {
  return new Request("https://dmaths.test/api/applications/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
});

describe("applications/submit — bot protection", () => {
  it("silently drops a filled honeypot without inserting", async () => {
    const res = await POST(makeReq({ ...VALID, website: "http://spam.example", loadedAt: Date.now() - 5000 }, "10.1.0.1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("silently drops a too-fast submission without inserting", async () => {
    const res = await POST(makeReq({ ...VALID, website: "", loadedAt: Date.now() }, "10.1.0.2"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("drops a submission with no loadedAt (missing time-trap) without inserting", async () => {
    const res = await POST(makeReq({ ...VALID, website: "" }, "10.1.0.3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockAdmin._qb.insert).not.toHaveBeenCalled();
  });

  it("inserts a genuine submission (empty honeypot, plausible elapsed time)", async () => {
    const res = await POST(makeReq({ ...VALID, website: "", loadedAt: Date.now() - 5000 }, "10.1.0.4"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockAdmin._qb.insert).toHaveBeenCalledTimes(1);
  });
});
