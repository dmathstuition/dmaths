import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { validateQuestion, normaliseQuestion, MAX_OPTIONS, type BankQuestion } from "@/lib/questionBank";

// Staff-only: draft multiple-choice questions with the A.I. Returns them for the
// admin/tutor to review and edit — it does NOT save; saving still goes through
// /api/question-bank so nothing lands in the bank unreviewed.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify the session (requireStaff already did role) and rate-limit the paid call.
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-questions:${user.id}`, 8, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const level = String(b?.level ?? "").trim().slice(0, 40);
  const topic = String(b?.topic ?? "").trim().slice(0, 120);
  const difficulty = String(b?.difficulty ?? "mixed").trim().slice(0, 20);
  const count = Math.min(10, Math.max(1, Number(b?.count) || 5));
  if (!subject) return NextResponse.json({ error: "Pick a subject first." }, { status: 400 });

  const system = `You write multiple-choice questions for D-Maths, an online tuition service for Nigerian primary/secondary learners (WAEC/JAMB/NECO/BECE-aligned where relevant). Subjects: Mathematics, English, and beginner coding (Python, web).

Write exactly ${count} ${difficulty} multiple-choice questions.
Subject: ${subject}${level ? ` · Level: ${level}` : ""}${topic ? ` · Topic: ${topic}` : ""}.

RULES:
- Each question has exactly 4 options, with ONE correct answer.
- "answer" is the 0-based index (0–3) of the correct option.
- Options are short and unambiguous; wrong options are plausible, not silly.
- Age-appropriate, clear, correct. No trick wording. British/Nigerian spelling.
- Do NOT include working, explanations or letter labels (A/B/C/D) inside the text.

Return ONLY strict JSON, no prose, in this exact shape:
{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0}]}`;

  let text: string;
  try {
    text = await aiChat({ system, user: "Generate the questions now.", maxTokens: 2000 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ questions?: Partial<BankQuestion>[] }>(text);
  const raw = Array.isArray(parsed?.questions) ? parsed!.questions! : Array.isArray(parsed) ? (parsed as any) : [];
  // Keep only well-formed questions (clamp options to the bank's max).
  const questions = raw
    .map((q) => normaliseQuestion({ ...q, options: (q.options ?? []).slice(0, MAX_OPTIONS) }))
    .filter((q) => validateQuestion(q) === null);

  if (!questions.length) {
    return NextResponse.json({ error: "The A.I didn't return usable questions — try again or tweak the topic." }, { status: 502 });
  }
  return NextResponse.json({ questions, subject, level, topic });
}
