import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { validateQuestion, normaliseQuestion, type BankQuestion } from "@/lib/questionBank";
import { standardByKey, resolveSubject, mockPaperCount, mockGroupName } from "@/lib/mockPaper";

// Staff-only: draft a full exam-standard mock paper (WAEC / JAMB) for a subject
// or a random one. Returns the questions for review — it does NOT save; saving
// goes through /api/question-bank (exam-tagged, grouped) so mocks then draw from
// them and nothing lands in the bank unreviewed.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-mock-paper:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const std = standardByKey(String(b?.exam ?? ""));
  const subject = resolveSubject(String(b?.subject ?? ""));
  const topic = String(b?.topic ?? "").trim().slice(0, 120);
  const level = String(b?.level ?? "").trim().slice(0, 40);
  const count = mockPaperCount(std, b?.count);

  const scope = topic
    ? `Focus the whole paper on this topic: ${topic}.`
    : `Spread the questions across the core ${subject} topics in the syllabus (a mixed paper).`;

  const system = `You are an experienced Nigerian examiner setting a mock ${std.key} paper for D-Maths. Write to genuine ${std.label} standard: syllabus-aligned, exam-realistic difficulty and phrasing, Nigerian context and spelling.

Set exactly ${count} multiple-choice questions in ${subject}${level ? ` for ${level} candidates` : ""}.
${scope}

RULES:
- Each question has exactly 4 options with ONE unambiguous best answer — the calibre and style a candidate meets in the real ${std.key} exam.
- "answer" is the 0-based index (0–3) of the correct option.
- Distractors are plausible exam-style wrong answers (common misconceptions), never silly.
- Add a short "topic" for each question (the syllabus area it tests) so results break down by topic.
- Put any needed working context in the question text; do NOT include the solution, explanations, or letter labels (A/B/C/D) inside the text or options.

Return ONLY strict JSON, no prose, in this exact shape:
{"questions":[{"question":"...","topic":"...","options":["...","...","...","..."],"answer":0}]}`;

  let text: string;
  try {
    text = await aiChat({ system, user: `Set the ${std.key} ${subject} paper now.`, maxTokens: 4000 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ questions?: (Partial<BankQuestion> & { topic?: string })[] }>(text);
  const raw = Array.isArray(parsed?.questions) ? parsed!.questions! : Array.isArray(parsed) ? (parsed as any) : [];
  // Keep only well-formed questions, preserving each one's own topic.
  const questions = raw
    .map((q) => ({ ...normaliseQuestion({ ...q, options: (q.options ?? []).slice(0, 4) }), topic: String((q as any).topic ?? topic).trim().slice(0, 80) }))
    .filter((q) => validateQuestion(q) === null);

  if (!questions.length) {
    return NextResponse.json({ error: "The A.I didn't return usable questions — try again or tweak the subject/topic." }, { status: 502 });
  }
  return NextResponse.json({
    questions, exam: std.key, subject, level, topic,
    count: questions.length, groupName: mockGroupName(std.key, subject),
  });
}
