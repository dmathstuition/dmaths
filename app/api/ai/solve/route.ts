import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";

// Learner-facing "Question solver": paste or type a maths/science question and
// get a clear, worked, step-by-step solution. This teaches the method (numbered
// steps + the final answer) rather than just spitting a number, so it's a study
// aid, not a shortcut. Auth-gated + rate-limited like the other AI routes.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-solve:${user.id}`, 12, 60_000)) {
    return NextResponse.json({ error: "Give me a moment and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const problem = String(b?.problem ?? "").trim().slice(0, 2000);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  if (problem.length < 3) {
    return NextResponse.json({ error: "Type or paste a question first." }, { status: 400 });
  }

  const system = `You are "D-Maths A.I", a patient tutor for a Nigerian school learner (ages ~8–18). The learner has given you a question and wants to LEARN how to solve it — so teach the method, don't just give the number.

Return ONLY valid JSON, no prose around it, in exactly this shape:
{"steps": ["step 1 ...", "step 2 ...", "..."], "answer": "the final answer", "topic": "the topic in 1-3 words"}

Rules:
- 2 to 6 short steps, each a single clear sentence a learner can follow. Show the working (the actual arithmetic/algebra), not just descriptions.
- Write plain text only — no markdown, no ** **, no LaTeX. Use plain symbols like x^2, *, /, =, √.
- "answer" is the concise final result (e.g. "x = 7" or "24 cm²"). If the question isn't a solvable problem, set answer to "" and use steps to explain what's missing.
- Keep it warm but tight. No greetings.`;

  const userMsg = `${subject ? `Subject: ${subject}\n` : ""}Question:\n${problem}`;

  try {
    const reply = await aiChat({ system, user: userMsg, maxTokens: 700 });
    const parsed = extractJson<{ steps?: unknown; answer?: unknown; topic?: unknown }>(reply);
    const steps = Array.isArray(parsed?.steps)
      ? parsed!.steps.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [];
    if (!steps.length) {
      // Model didn't give clean JSON — fall back to the raw reply as one block.
      const text = reply.trim();
      if (!text) return NextResponse.json({ error: "Couldn't solve that one — try rephrasing it." }, { status: 502 });
      return NextResponse.json({ steps: [text], answer: "", topic: subject });
    }
    return NextResponse.json({
      steps,
      answer: String(parsed?.answer ?? "").trim().slice(0, 300),
      topic: String(parsed?.topic ?? subject).trim().slice(0, 60),
    });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
