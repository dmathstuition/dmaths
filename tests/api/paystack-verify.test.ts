import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import "../mocks/server";
import { server } from "../mocks/server";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));

import { POST } from "@/app/api/paystack/verify/route";

const PAYSTACK_URL = "https://api.paystack.co/transaction/verify";

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/paystack/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  process.env.PAYSTACK_SECRET_KEY = "sk_test_fake";
});

describe("POST /api/paystack/verify", () => {
  it("converts 1500000 kobo to 15000 naira in the response", async () => {
    const res = await POST(makeRequest({ reference: "ref-abc" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.verified).toBe(true);
    expect(json.amount).toBe(15000);
  });

  it("converts 1 kobo to 0.01 naira", async () => {
    server.use(
      http.get(`${PAYSTACK_URL}/:ref`, () =>
        HttpResponse.json({ status: true, data: { status: "success", amount: 1, customer: { email: "a@b.com" } } })
      )
    );
    const res = await POST(makeRequest({ reference: "ref-1" }));
    expect((await res.json()).amount).toBeCloseTo(0.01);
  });

  it("converts 0 kobo to 0 naira", async () => {
    server.use(
      http.get(`${PAYSTACK_URL}/:ref`, () =>
        HttpResponse.json({ status: true, data: { status: "success", amount: 0, customer: { email: "a@b.com" } } })
      )
    );
    const res = await POST(makeRequest({ reference: "ref-0" }));
    expect((await res.json()).amount).toBe(0);
  });

  it("returns 400 { verified: false } when payment status is 'failed'", async () => {
    server.use(
      http.get(`${PAYSTACK_URL}/:ref`, () =>
        HttpResponse.json({ status: true, data: { status: "failed", amount: 1500000 } })
      )
    );
    const res = await POST(makeRequest({ reference: "ref-fail" }));
    expect(res.status).toBe(400);
    expect((await res.json()).verified).toBe(false);
  });

  it("returns 400 when Paystack top-level status is false", async () => {
    server.use(
      http.get(`${PAYSTACK_URL}/:ref`, () =>
        HttpResponse.json({ status: false, message: "Invalid key" })
      )
    );
    const res = await POST(makeRequest({ reference: "ref-bad" }));
    expect(res.status).toBe(400);
  });

  it("updates the application record when applicationId is provided", async () => {
    const res = await POST(makeRequest({ reference: "ref-abc", applicationId: "app-1" }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).toHaveBeenCalledWith("applications");
    expect(mockAdmin._qb.update).toHaveBeenCalledWith(
      expect.objectContaining({ payment_amount: 15000, payment_verified: true })
    );
  });

  it("returns verified: true without a DB call when applicationId is absent", async () => {
    const res = await POST(makeRequest({ reference: "ref-abc" }));
    expect(res.status).toBe(200);
    expect((await res.json()).verified).toBe(true);
    // from() may still be called by other paths, but update() should NOT target applications
    const updateCalls = vi.mocked(mockAdmin._qb.update).mock.calls;
    const hadApplicationsUpdate = updateCalls.some(
      ([payload]: [any]) => "payment_verified" in (payload ?? {})
    );
    expect(hadApplicationsUpdate).toBe(false);
  });

  it("returns 400 when reference is missing from the body", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/reference/i);
  });

  it("returns 503 when PAYSTACK_SECRET_KEY is not set", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await POST(makeRequest({ reference: "ref-abc" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/not configured/i);
  });

  it("encodes special characters in the reference URL parameter", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${PAYSTACK_URL}/:ref`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({ status: true, data: { status: "success", amount: 1500000, customer: { email: "a@b.com" } } });
      })
    );
    await POST(makeRequest({ reference: "ref/with/slash" }));
    expect(capturedUrl).toContain("ref%2Fwith%2Fslash");
  });
});
