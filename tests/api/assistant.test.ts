import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));

// Mock the Anthropic SDK: default export is a class whose messages.create we control.
// Everything the factory touches must be created inside it (vi.mock is hoisted).
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class RateLimitError extends Error {}
  class AuthenticationError extends Error {}
  class Anthropic {
    messages = { create };
    static RateLimitError = RateLimitError;
    static AuthenticationError = AuthenticationError;
  }
  return { default: Anthropic };
});

import Anthropic from "@anthropic-ai/sdk";
import { POST } from "@/app/api/assistant/route";
const { RateLimitError } = Anthropic as unknown as { RateLimitError: new (m: string) => Error };

function req(body: unknown) {
  return new Request("https://dmaths.test/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OLD_KEY = process.env.ANTHROPIC_API_KEY;
beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
  create.mockReset();
  process.env.ANTHROPIC_API_KEY = "sk-test";
});
afterEach(() => { process.env.ANTHROPIC_API_KEY = OLD_KEY; });

describe("POST /api/assistant", () => {
  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ messages: [{ role: "user", content: "help" }] }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("503 with a friendly message when the key is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(req({ messages: [{ role: "user", content: "help" }] }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/isn't switched on/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a hint reply for a valid learner question", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "What have you tried so far? 🙂" }] });
    const res = await POST(req({ messages: [{ role: "user", content: "2x=10, what is x?" }] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toContain("tried so far");
    // Uses the pinned model and a system prompt that forbids full answers.
    const arg = create.mock.calls[0][0];
    expect(arg.model).toBe("claude-opus-4-8");
    expect(arg.system).toMatch(/NEVER give the full/i);
  });

  it("rejects a payload whose last turn isn't a user message", async () => {
    const res = await POST(req({ messages: [{ role: "assistant", content: "hi" }] }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("maps a rate-limit error to a 429", async () => {
    create.mockRejectedValue(new RateLimitError("slow down"));
    const res = await POST(req({ messages: [{ role: "user", content: "help" }] }));
    expect(res.status).toBe(429);
  });

  it("passes optional task context into the system prompt", async () => {
    create.mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    await POST(req({ messages: [{ role: "user", content: "stuck" }], context: "Loop over a list in Python" }));
    const arg = create.mock.calls[0][0];
    expect(arg.system).toMatch(/Loop over a list in Python/);
  });

  it("grants staff (full-answer) mode to a tutor", async () => {
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    create.mockResolvedValue({ content: [{ type: "text", text: "Here's the full solution…" }] });
    await POST(req({ messages: [{ role: "user", content: "give me a worked solution" }], mode: "staff" }));
    const arg = create.mock.calls[0][0];
    expect(arg.system).toMatch(/teaching assistant/i);
    expect(arg.system).toMatch(/complete answers/i);
  });

  it("denies staff mode to a learner — falls back to the hint-only prompt", async () => {
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    create.mockResolvedValue({ content: [{ type: "text", text: "What have you tried?" }] });
    await POST(req({ messages: [{ role: "user", content: "just give me the answer" }], mode: "staff" }));
    const arg = create.mock.calls[0][0];
    expect(arg.system).toMatch(/NEVER give the full/i);
  });
});
