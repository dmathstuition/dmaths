import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse } from "@/lib/ai";

// Learner-facing: explain a question that has ALREADY been answered & graded
// (practice / CBT review). Because the answer is already revealed, giving the
// full worked explanation here is teaching, not doing their homework.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-explain:${user.id}`, 15, 60_000)) {
    return NextResponse.json({ error: "Give me a moment and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const question = String(b?.question ?? "").trim().slice(0, 1500);
  const options: string[] = Array.isArray(b?.options) ? b.options.slice(0, 6).map((o: any) => String(o).slice(0, 300)) : [];
  const answer = Number(b?.answer);
  const chosen = Number(b?.chosen);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  if (!question || !options.length || !Number.isInteger(answer)) {
    return NextResponse.json({ error: "Nothing to explain." }, { status: 400 });
  }

  const correctText = options[answer] ?? "";
  const chosenText = Number.isInteger(chosen) && chosen >= 0 ? options[chosen] : null;

  const system = `You are "D-Maths A.I", a warm tutor for a Nigerian school learner (ages ~8–18). The learner has just FINISHED a practice question and the correct answer is already shown, so it's fine to explain it fully — this is review, not their homework.

Explain, in 2–4 short sentences with simple words:
1) why the correct answer is right (show the key step briefly),
2) if they picked a wrong one, gently why that was tempting or where the slip is.
Encouraging tone, one emoji at most. Do not restate the whole question.`;

  const userMsg = `${subject ? `Subject: ${subject}\n` : ""}Question: ${question}
Options: ${options.map((o, i) => `${"ABCDEF"[i]}) ${o}`).join("  ")}
Correct answer: ${"ABCDEF"[answer]}) ${correctText}
${chosenText !== null ? `The learner chose: ${chosenText}${chosen === answer ? " (correct)" : " (wrong)"}` : "The learner left it blank."}`;

  try {
    const reply = await aiChat({ system, user: userMsg, maxTokens: 400 });
    return NextResponse.json({ explanation: reply || "Give it another look — you're close! 💪" });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
