import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => mockServer }));

// Mock the OpenAI SDK: default export is a class whose chat.completions.create we
// control. Everything the factory touches must be created inside it (vi.mock is hoisted).
const create = vi.fn();
vi.mock("openai", () => {
  class RateLimitError extends Error {}
  class AuthenticationError extends Error {}
  class OpenAI {
    chat = { completions: { create } };
    static RateLimitError = RateLimitError;
    static AuthenticationError = AuthenticationError;
  }
  return { default: OpenAI };
});

import OpenAI from "openai";
import { POST } from "@/app/api/assistant/route";
const { RateLimitError } = OpenAI as unknown as { RateLimitError: new (m: string) => Error };

// Convenience: an OpenAI chat.completions response with a single text reply.
const reply = (text: string) => ({ choices: [{ message: { content: text } }] });

function req(body: unknown) {
  return new Request("https://dmaths.test/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OLD_KEY = process.env.DEEPSEEK_API_KEY;
beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "stu-1" } }, error: null });
  create.mockReset();
  process.env.DEEPSEEK_API_KEY = "sk-test";
});
afterEach(() => { process.env.DEEPSEEK_API_KEY = OLD_KEY; });

// The system prompt is sent as the first message in the list.
const systemOf = (arg: any) => arg.messages[0].content as string;

describe("POST /api/assistant", () => {
  it("401 when unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req({ messages: [{ role: "user", content: "help" }] }));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("503 with a friendly message when the key is not configured", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const res = await POST(req({ messages: [{ role: "user", content: "help" }] }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/isn't switched on/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns a hint reply for a valid learner question", async () => {
    create.mockResolvedValue(reply("What have you tried so far? 🙂"));
    const res = await POST(req({ messages: [{ role: "user", content: "2x=10, what is x?" }] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toContain("tried so far");
    // Default model, and a system prompt that forbids full answers.
    const arg = create.mock.calls[0][0];
    expect(arg.model).toBe("deepseek-chat");
    expect(systemOf(arg)).toMatch(/NEVER give the full/i);
    expect(arg.messages[0].role).toBe("system");
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
    create.mockResolvedValue(reply("ok"));
    await POST(req({ messages: [{ role: "user", content: "stuck" }], context: "Loop over a list in Python" }));
    expect(systemOf(create.mock.calls[0][0])).toMatch(/Loop over a list in Python/);
  });

  it("grants staff (full-answer) mode to a tutor", async () => {
    mockServer._qb.single.mockResolvedValue({ data: { role: "tutor" }, error: null });
    create.mockResolvedValue(reply("Here's the full solution…"));
    await POST(req({ messages: [{ role: "user", content: "give me a worked solution" }], mode: "staff" }));
    const system = systemOf(create.mock.calls[0][0]);
    expect(system).toMatch(/teaching assistant/i);
    expect(system).toMatch(/complete answers/i);
  });

  it("denies staff mode to a learner — falls back to the hint-only prompt", async () => {
    mockServer._qb.single.mockResolvedValue({ data: { role: "student" }, error: null });
    create.mockResolvedValue(reply("What have you tried?"));
    await POST(req({ messages: [{ role: "user", content: "just give me the answer" }], mode: "staff" }));
    expect(systemOf(create.mock.calls[0][0])).toMatch(/NEVER give the full/i);
  });

  it("rate-limits a single account hammering the endpoint", async () => {
    // Isolated user id so the per-user counter doesn't touch the other tests.
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "rl-user" } }, error: null });
    create.mockResolvedValue(reply("ok"));
    let sawLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = await POST(req({ messages: [{ role: "user", content: "hi" }] })); // eslint-disable-line no-await-in-loop
      if (res.status === 429) { sawLimit = true; break; }
    }
    expect(sawLimit).toBe(true);
  });
});
