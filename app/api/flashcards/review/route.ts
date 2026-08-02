import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { schedule, flashcardReviewPoints, type Grade } from "@/lib/srs";
import { watDay } from "@/lib/dailyReward";

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

  // The card must actually be one this learner can see. Without this any signed-in
  // user could post arbitrary ids and litter the review table with rows for cards
  // (and unpublished decks) that were never theirs to study.
  const { data: card } = await supa
    .from("flashcards").select("id").eq("id", cardId).maybeSingle();
  if (!card) return NextResponse.json({ error: "That card isn't available to you." }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("flashcard_reviews")
    .select("reps, interval_days, ease, last_reviewed").eq("student_id", user.id).eq("card_id", cardId).maybeSingle();

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

  // Reward keeping up revision: a point per distinct card reviewed today, capped.
  // Re-grading a card already reviewed today earns nothing (not a new card).
  const today = watDay();
  const alreadyReviewedToday = !!existing?.last_reviewed && watDay(new Date(existing.last_reviewed)) === today;
  let points = 0, newTotal: number | undefined;
  try {
    const dayStart = new Date(`${today}T00:00:00+01:00`).toISOString();
    const { count } = await admin.from("flashcard_reviews")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id).gte("last_reviewed", dayStart);
    // `count` includes the row we just upserted; if this card is newly reviewed
    // today, back it out so the cap is measured against *earlier* cards.
    const earlierToday = Math.max(0, (count ?? 0) - (alreadyReviewedToday ? 0 : 1));
    points = flashcardReviewPoints(earlierToday, alreadyReviewedToday);
    if (points > 0) {
      const { data: me } = await admin.from("profiles").select("reward_points").eq("id", user.id).single();
      newTotal = Number(me?.reward_points ?? 0) + points;
      await admin.from("profiles").update({ reward_points: newTotal }).eq("id", user.id);
    }
  } catch { /* rewards are a bonus — never fail a saved review over them */ }

  return NextResponse.json({ ok: true, dueOn: next.dueOn, intervalDays: next.intervalDays, points, newTotal });
}
