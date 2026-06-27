import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { makeMockSupabaseClient } from "../mocks/supabase";

let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));

import { POST } from "@/app/api/paystack/webhook/route";

const SECRET = "sk_test_fake";

function sign(raw: string) {
  return crypto.createHmac("sha512", SECRET).update(raw).digest("hex");
}

function makeRequest(bodyObj: object, signature?: string) {
  const raw = JSON.stringify(bodyObj);
  return new Request("https://dmaths.test/api/paystack/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paystack-signature": signature ?? sign(raw),
    },
    body: raw,
  });
}

beforeEach(() => {
  mockAdmin = makeMockSupabaseClient();
  process.env.PAYSTACK_SECRET_KEY = SECRET;
});

describe("POST /api/paystack/webhook", () => {
  it("rejects a request with an invalid signature (401)", async () => {
    const res = await POST(makeRequest({ event: "charge.success", data: { reference: "r1", status: "success" } }, "deadbeef"));
    expect(res.status).toBe(401);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature header", async () => {
    const raw = JSON.stringify({ event: "charge.success", data: {} });
    const req = new Request("https://dmaths.test/api/paystack/webhook", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: raw,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when the secret key is not configured", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    const res = await POST(makeRequest({ event: "charge.success", data: {} }));
    expect(res.status).toBe(503);
  });

  it("records a genuine charge.success in the payments ledger", async () => {
    const body = {
      event: "charge.success",
      data: {
        reference: "ref-xyz",
        status: "success",
        amount: 10499900, // ₦104,999 in kobo
        currency: "NGN",
        customer: { email: "parent@example.com" },
        metadata: { plan: "pers-coding", camp: "summer-2026" },
      },
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockAdmin.from).toHaveBeenCalledWith("payments");
    expect(mockAdmin._qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ reference: "ref-xyz", amount: 104999, currency: "NGN", plan: "pers-coding" }),
      expect.objectContaining({ onConflict: "reference" }),
    );
  });

  it("ignores non-charge events but still returns 200", async () => {
    const res = await POST(makeRequest({ event: "transfer.success", data: { reference: "r2" } }));
    expect(res.status).toBe(200);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });
});
