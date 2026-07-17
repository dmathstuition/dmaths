import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

// The "D-Maths A.I" assistant, powered by DeepSeek (OpenAI-compatible API, so we
// use the openai SDK pointed at DeepSeek's endpoint). Two modes:
//  • learner (default) — gives *hints and guiding questions*, never the finished
//    answer, so the learner still does the thinking (and it never just solves
//    their graded assignment).
//  • staff — for tutors/admin: a teaching assistant that CAN give full worked
//    solutions, lesson plans, marking help, etc. Only granted after the caller's
//    role is verified server-side, so a learner can't unlock it by passing a flag.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// DeepSeek is OpenAI-compatible. `deepseek-chat` (DeepSeek-V3) is fast and strong
// for tutoring; set DEEPSEEK_MODEL=deepseek-reasoner for heavier step-by-step
// reasoning. Base URL is overridable for self-host/proxy setups.
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const LEARNER_SYSTEM = `You are "D-Maths A.I", the friendly learning buddy for D-Maths — an online tuition service for primary and secondary school learners in Nigeria (ages ~8–18). Subjects: Mathematics, English, and beginner coding (Python and web / HTML-CSS-JavaScript).

Your job is to help a learner who is stuck, WITHOUT doing their work for them.

HARD RULES — follow these every time:
- NEVER give the full, final answer to a homework, assignment, quiz or test question. Not even "just this once".
- Instead: ask a guiding question, explain the underlying idea with a *different* example, or give the next small step and let them try it.
- If they push for the answer ("just tell me", "give me the code"), gently refuse and offer the next hint instead. Praise effort.
- If they share code that has a bug, point them toward *where* to look and *what* to check — don't paste the corrected code wholesale. A tiny one-line illustration of a concept is fine; a complete solution is not.
- Keep it short and warm: 2–5 sentences, simple words, encouraging tone. Use the occasional emoji, not every line.
- Break problems into steps. Ask "what have you tried so far?" when useful.
- Stay on schoolwork (maths, English, coding, study skills). If asked about anything unsafe, personal, or off-topic, kindly steer back to learning and suggest they message their tutor.
- Never ask for or repeat passwords, payment details, or personal contact information.

You are talking to a young learner. Be patient, kind, and clear.`;

const STAFF_SYSTEM = `You are "D-Maths A.I", the teaching assistant for D-Maths — an online tuition service for primary and secondary school learners in Nigeria (ages ~8–18). Subjects: Mathematics, English, and beginner coding (Python and web / HTML-CSS-JavaScript). You are talking to a tutor or the admin — a professional colleague, not a learner.

Help them teach well. You CAN and SHOULD give complete answers here:
- Full worked solutions and step-by-step explanations they can teach from.
- Lesson plans, starter/plenary ideas, worked examples, and practice questions with answer keys.
- Marking and feedback: model answers, mark schemes, and constructive comments for a learner.
- Explaining a concept several ways, spotting a learner's likely misconception, differentiation for different levels, and adapting to the Nigerian curriculum (WAEC/JAMB/NECO/BECE) where relevant.
- Reviewing or debugging code and writing correct example code.

Style: clear and practical, use worked examples and short steps. Show your working for maths. It's fine to be thorough when the task needs it. Stay on teaching and schoolwork; never ask for or repeat passwords, payment details, or personal contact information.`;

export async function POST(req: Request) {
  // Authenticated users only — the assistant lives inside the portal.
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  // Per-user rate limit: stops a signed-in account (or a stolen session) from
  // hammering the paid DeepSeek endpoint — cost-abuse / DoS protection.
  if (!rateLimit(`assistant:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "You're chatting very fast — give me a few seconds and try again." }, { status: 429 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "The learning buddy isn't switched on yet. Please ask your tutor — or set DEEPSEEK_API_KEY in the deployment." },
      { status: 503 },
    );
  }

  const payload = await req.json().catch(() => null);
  const incoming: any[] = Array.isArray(payload?.messages) ? payload.messages : [];
  // Keep only well-formed turns, cap the history, and cap each message length so a
  // pasted essay can't blow the context (or the bill).
  const messages = incoming
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16)
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Nothing to answer." }, { status: 400 });
  }

  // Staff mode (full worked answers) is only granted after verifying the caller is
  // a tutor or admin — a learner passing mode:"staff" still gets the hint-only prompt.
  let staff = false;
  if (payload?.mode === "staff") {
    const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
    staff = me?.role === "admin" || me?.role === "tutor";
  }
  const base = staff ? STAFF_SYSTEM : LEARNER_SYSTEM;

  // Optional context about the task being worked on (task description + editor
  // code), so answers/hints land.
  const context = String(payload?.context ?? "").slice(0, 3000).trim();
  const system = context
    ? staff
      ? `${base}\n\nThe learner's current task (for your context):\n${context}`
      : `${base}\n\nThe learner is currently working on this task (for your context only — still don't hand them the answer):\n${context}`
    : base;

  try {
    const client = new OpenAI({ apiKey: key, baseURL: BASE_URL });
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      // DeepSeek (OpenAI-compatible) takes the system prompt as the first message.
      messages: [{ role: "system", content: system }, ...messages],
    });
    const reply = (res.choices[0]?.message?.content ?? "").trim();
    return NextResponse.json({ reply: reply || "Hmm, I lost my train of thought — try asking again?" });
  } catch (err: any) {
    // Typed SDK errors carry a status; surface a friendly line, log the detail.
    console.error("assistant error", err?.status, err?.message);
    if (err instanceof OpenAI.RateLimitError) {
      return NextResponse.json({ error: "I'm a bit busy right now — try again in a moment." }, { status: 429 });
    }
    if (err instanceof OpenAI.AuthenticationError) {
      return NextResponse.json({ error: "The learning buddy is misconfigured. Please tell your tutor." }, { status: 503 });
    }
    return NextResponse.json({ error: "Sorry, I couldn't think of a reply just now. Please try again." }, { status: 502 });
  }
}
