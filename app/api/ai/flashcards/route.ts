import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { cleanCardBatch, type CardDraft } from "@/lib/flashcardDraft";

// Staff-only: draft revision flashcards with the A.I. Returns front/back pairs
// for the admin/tutor to review and edit — it does NOT save; saving still goes
// through /api/flashcards so nothing lands in a deck unreviewed.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!rateLimit(`ai-flashcards:${user.id}`, 8, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const level = String(b?.level ?? "").trim().slice(0, 40);
  const topic = String(b?.topic ?? "").trim().slice(0, 120);
  const count = Math.min(12, Math.max(1, Number(b?.count) || 8));
  if (!subject) return NextResponse.json({ error: "Pick a subject first." }, { status: 400 });

  const system = `You write revision flashcards for D-Maths, an online tuition service for Nigerian primary/secondary learners (WAEC/JAMB/NECO/BECE-aligned where relevant). Subjects: Mathematics, English, and beginner coding (Python, web).

Write exactly ${count} flashcards.
Subject: ${subject}${level ? ` · Level: ${level}` : ""}${topic ? ` · Topic: ${topic}` : ""}.

RULES:
- "front" is a short question, prompt or term to recall.
- "back" is the concise, correct answer or definition — a line or two, no filler.
- Each card tests ONE idea. No duplicates. Age-appropriate. British/Nigerian spelling.
- Keep both sides under 400 characters. No letter labels, no "Q:"/"A:" prefixes.

Return ONLY strict JSON, no prose, in this exact shape:
{"cards":[{"front":"...","back":"..."}]}`;

  let text: string;
  try {
    text = await aiChat({ system, user: "Generate the flashcards now.", maxTokens: 2000 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ cards?: Partial<CardDraft>[] }>(text);
  const raw = Array.isArray(parsed?.cards) ? parsed!.cards! : Array.isArray(parsed) ? (parsed as any) : [];
  const cards = cleanCardBatch(raw);

  if (!cards.length) {
    return NextResponse.json({ error: "The A.I didn't return usable cards — try again or tweak the topic." }, { status: 502 });
  }
  return NextResponse.json({ cards, subject, level, topic });
}
