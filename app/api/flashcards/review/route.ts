import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { schedule, type Grade } from "@/lib/srs";

const GRADES: Grade[] = ["again", "hard", "good", "easy"];

// A learner grades a flashcard; we compute the next review date server-side so
// the schedule can't be gamed from the client. The student id comes from the
// session, never the body.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const cardId = String(payload?.cardId ?? "");
  const grade = String(payload?.grade ?? "") as Grade;
  if (!cardId || !GRADES.includes(grade)) {
    return NextResponse.json({ error: "cardId and a valid grade are required." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("flashcard_reviews")
    .select("reps, interval_days, ease").eq("student_id", user.id).eq("card_id", cardId).maybeSingle();

  const next = schedule(
    existing ? { reps: existing.reps, intervalDays: existing.interval_days, ease: Number(existing.ease) } : null,
    grade,
  );

  const { error } = await admin.from("flashcard_reviews").upsert({
    student_id: user.id, card_id: cardId,
    reps: next.reps, interval_days: next.intervalDays, ease: next.ease,
    due_on: next.dueOn, last_reviewed: new Date().toISOString(),
  }, { onConflict: "student_id,card_id" });

  if (error) {
    const msg = /relation .*flashcard_reviews.* does not exist/i.test(error.message)
      ? "Flashcards need migration-flashcards.sql — run it in Supabase." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, dueOn: next.dueOn, intervalDays: next.intervalDays });
}
