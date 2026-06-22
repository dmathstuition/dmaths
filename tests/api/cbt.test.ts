import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockSupabaseClient } from "../mocks/supabase";

// Mock next/headers before importing the route
vi.mock("next/headers", () => ({ cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })) }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return actual;
});

let mockServer: ReturnType<typeof makeMockSupabaseClient>;
let mockAdmin: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: () => mockServer,
}));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => mockAdmin,
}));
vi.mock("@/lib/ratelimit", () => ({
  rateLimit: vi.fn().mockReturnValue(true),
  clientKey: vi.fn().mockReturnValue("cbt:1.2.3.4"),
}));

import { POST } from "@/app/api/cbt/route";
import { rateLimit } from "@/lib/ratelimit";

function makeRequest(body: object) {
  return new Request("https://dmaths.test/api/cbt", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function makeQuestions(n: number, correctIdx = 0) {
  return Array.from({ length: n }, () => ({ text: "Q?", options: ["A", "B", "C", "D"], answer: correctIdx }));
}

function makeAnswers(n: number, correctIdx = 0, wrongFrom = n) {
  return Array.from({ length: n }, (_, i) => (i < wrongFrom ? correctIdx : (correctIdx === 0 ? 1 : 0)));
}

function makeSubmission(overrides: object = {}) {
  return {
    status: "pending",
    assignment: {
      cbt_questions: makeQuestions(10),
      cbt_close: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockServer = makeMockSupabaseClient();
  mockAdmin = makeMockSupabaseClient();
  vi.mocked(rateLimit).mockReturnValue(true);
});

describe("POST /api/cbt", () => {
  it("grades 7/10 correct answers as 70", async () => {
    const questions = makeQuestions(10, 0);
    const answers = makeAnswers(10, 0, 7); // first 7 correct
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.grade).toBe(70);
    expect(json.correct).toBe(7);
    expect(json.total).toBe(10);
  });

  it("grades 10/10 correct as 100", async () => {
    const questions = makeQuestions(10, 0);
    const answers = makeAnswers(10, 0, 10);
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();
    expect(json.grade).toBe(100);
  });

  it("grades 0/10 correct as 0", async () => {
    const questions = makeQuestions(10, 0);
    const answers = makeAnswers(10, 0, 0); // all wrong (answer 1, not 0)
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();
    expect(json.grade).toBe(0);
  });

  it("rounds 1/3 correct to 33 (Math.round)", async () => {
    const questions = makeQuestions(3, 0);
    const answers = [0, 1, 1]; // 1 correct
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();
    expect(json.grade).toBe(33);
  });

  it("accepts correctAnswer key as alternative to answer", async () => {
    const questions = [
      { text: "Q?", options: ["A", "B", "C", "D"], correctAnswer: 2 },
      { text: "Q?", options: ["A", "B", "C", "D"], correctAnswer: 2 },
    ];
    const answers = [2, 2]; // both correct
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();
    expect(json.grade).toBe(100);
  });

  it("treats null answer as wrong (unanswered question)", async () => {
    const questions = makeQuestions(3, 0);
    const answers = [0, null, null]; // only first correct
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers }));
    const json = await res.json();
    expect(json.correct).toBe(1);
    expect(json.grade).toBe(33);
  });

  it("returns 400 when answer count does not match question count", async () => {
    const questions = makeQuestions(10, 0);
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [0, 0, 0] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/mismatch/i);
  });

  it("returns 400 when submission is already graded", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ status: "graded" }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/already submitted/i);
  });

  it("returns 400 when the CBT window has closed", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: makeQuestions(3), cbt_close: past } }),
      error: null,
    });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [0, 0, 0] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/closed/i);
  });

  it("returns 401 when the user is unauthenticated", async () => {
    mockServer.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(rateLimit).mockReturnValue(false);

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [] }));
    expect(res.status).toBe(429);
  });

  it("returns 500 when the DB update fails", async () => {
    const questions = makeQuestions(2, 0);
    mockServer.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockAdmin._qb.single.mockResolvedValueOnce({
      data: makeSubmission({ assignment: { cbt_questions: questions, cbt_close: null } }),
      error: null,
    });
    // The update chain is direct-awaited; configure that to return an error
    mockAdmin._qb._setDirectResolve({ error: { message: "DB update failed" } });

    const res = await POST(makeRequest({ submissionId: "sub-1", answers: [0, 0] }));
    expect(res.status).toBe(500);
  });
});
