import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { watDay } from "@/lib/dailyReward";
import { buildQuests, allQuestsDone, QUEST_BONUS } from "@/lib/quests";

// Daily Quests. Progress is computed live from existing activity tables; the
// all-clear bonus is credited once per WAT day (guarded by daily_quest_claims).
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*daily_quest_claims/i.test(m)
    ? "Daily Quests need migration-daily-quests.sql — run it in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, points: me?.reward_points ?? 0 };
}

// Today's completion counts for each quest, read with the service role. Each
// source degrades to 0 if its migration hasn't been run.
async function counts(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const day = watDay();
  const dayStart = new Date(`${day}T00:00:00+01:00`).toISOString();
  const [practice, cards, reward] = await Promise.all([
    admin.from("practice_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("day", day),
    admin.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("student_id", userId).gte("last_reviewed", dayStart),
    admin.from("daily_rewards").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("day", day),
  ]);
  return {
    practice: practice.count ?? 0,
    flashcards: cards.count ?? 0,
    reward: reward.count ?? 0,
  };
}

async function claimedToday(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data, error } = await admin.from("daily_quest_claims")
    .select("id").eq("student_id", userId).eq("day", watDay()).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function GET() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  try {
    const quests = buildQuests(await counts(admin, gate.user.id));
    let claimed = false;
    try { claimed = await claimedToday(admin, gate.user.id); } catch { /* table missing → treat as unclaimed */ }
    return NextResponse.json({ quests, allDone: allQuestsDone(quests), claimed, bonus: QUEST_BONUS });
  } catch (e: any) {
    return NextResponse.json({ error: explain(e?.message ?? "load failed"), quests: [], allDone: false, claimed: false, bonus: QUEST_BONUS }, { status: 200 });
  }
}

// Claim the all-clear bonus (once per day).
export async function POST() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();

  const quests = buildQuests(await counts(admin, gate.user.id));
  if (!allQuestsDone(quests)) {
    return NextResponse.json({ error: "Finish all three quests first." }, { status: 400 });
  }

  // Idempotent insert — the unique (student_id, day) index stops a double claim.
  const { error: insErr } = await admin.from("daily_quest_claims")
    .insert({ student_id: gate.user.id, day: watDay(), points: QUEST_BONUS });
  if (insErr) {
    if (/duplicate key|unique/i.test(insErr.message)) {
      return NextResponse.json({ ok: true, claimed: true, bonus: 0, newTotal: gate.points });
    }
    return NextResponse.json({ error: explain(insErr.message) }, { status: 500 });
  }

  const newTotal = Number(gate.points) + QUEST_BONUS;
  await admin.from("profiles").update({ reward_points: newTotal }).eq("id", gate.user.id);
  return NextResponse.json({ ok: true, claimed: true, bonus: QUEST_BONUS, newTotal });
}
