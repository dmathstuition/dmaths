import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));

import { GET } from "@/app/auth/confirm/route";

const link = (next: string) =>
  new Request(`https://dmaths.test/auth/confirm?token_hash=abc&type=recovery&next=${encodeURIComponent(next)}`);

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
});

describe("GET /auth/confirm", () => {
  it("follows a normal in-site next", async () => {
    const res = await GET(link("/reset-password"));
    expect(res.headers.get("location")).toBe("https://dmaths.test/reset-password");
  });

  // The reason this matters: `new URL("//evil.com", origin)` is another ORIGIN,
  // so an unchecked `next` turns a genuine reset link into an open redirect.
  it.each([
    "//evil.com",
    "https://evil.com/steal",
    "http://evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
  ])("refuses to leave the site for %s", async (next) => {
    const res = await GET(link(next));
    expect(res.headers.get("location")).toBe("https://dmaths.test/reset-password");
  });

  it("still sends an invalid token back to login", async () => {
    mockServer.auth.verifyOtp.mockResolvedValue({ data: null, error: { message: "expired" } });
    const res = await GET(link("/portal"));
    expect(res.headers.get("location")).toBe("https://dmaths.test/login?error=reset");
  });
});
