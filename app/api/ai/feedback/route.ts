import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse } from "@/lib/ai";

// Staff-only: draft constructive feedback for a graded submission. Returns text
// the tutor edits before saving — never posts anything itself.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-feedback:${user.id}`, 12, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const title = String(b?.title ?? "").trim().slice(0, 200);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const grade = b?.grade === undefined || b?.grade === null ? null : Number(b.grade);
  const learner = String(b?.learner ?? "").trim().slice(0, 60);
  const work = String(b?.work ?? "").trim().slice(0, 3000);

  const system = `You are a supportive tutor at D-Maths writing feedback on a Nigerian learner's assignment for the tutor to send.

Write 2–4 sentences of constructive feedback addressed to the learner:
- Open with something specific they did well.
- Name one clear, actionable thing to improve next time.
- Warm, encouraging, plain English. No emoji, no markdown, no "Dear …" heading — just the comment.`;

  const userMsg = `Assignment: ${title || "(untitled)"}${subject ? ` · Subject: ${subject}` : ""}
${grade !== null && !Number.isNaN(grade) ? `Score: ${grade}%\n` : ""}${learner ? `Learner's first name: ${learner}\n` : ""}${work ? `The learner's answer/work:\n${work}` : "(No submitted text available — write general feedback based on the score.)"}`;

  try {
    const reply = await aiChat({ system, user: userMsg, maxTokens: 350 });
    return NextResponse.json({ feedback: reply });
  } catch (err) {
    return aiErrorResponse(err);
  }
}
