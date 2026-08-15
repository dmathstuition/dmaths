import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computeAchievements, achievementById, type AchievementStat } from "@/lib/achievements";

// Achievement rewards. Each unlocked achievement pays a one-time bonus the
// learner claims; achievement_claims guards against double payment.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*achievement_claims/i.test(m)
    ? "Achievement rewards need migration-achievement-claims.sql — run it in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles")
    .select("role, reward_points, avg_score, streak_count, referral_count").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, me };
}

async function gatherStats(admin: ReturnType<typeof supabaseAdmin>, userId: string, me: any): Promise<AchievementStat> {
  const head = (q: any) => q.then((r: any) => r.count ?? 0).catch(() => 0);
  const [titles, mocks, practice, cards] = await Promise.all([
    head(admin.from("learner_cosmetics").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("kind", "title")),
    head(admin.from("mock_exam_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId)),
    head(admin.from("practice_sessions").select("id", { count: "exact", head: true }).eq("student_id", userId)),
    head(admin.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("student_id", userId)),
  ]);
  return {
    streak: me.streak_count ?? 0, points: me.reward_points ?? 0, avgScore: me.avg_score ?? 0,
    titles, mocks, practice, cards, referrals: me.referral_count ?? 0,
  };
}

async function claimedSet(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data } = await admin.from("achievement_claims").select("achievement_id").eq("student_id", userId);
  return new Set((data ?? []).map((r: any) => r.achievement_id));
}

export async function GET() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const [stat, claimed] = await Promise.all([gatherStats(admin, gate.user.id, gate.me), claimedSet(admin, gate.user.id)]);
  const achievements = computeAchievements(stat).map((a) => ({ ...a, claimed: claimed.has(a.id) }));
  return NextResponse.json({ achievements });
}

export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => null);
  const def = achievementById(String(body?.id ?? ""));
  if (!def) return NextResponse.json({ error: "Unknown achievement." }, { status: 400 });

  const stat = await gatherStats(admin, gate.user.id, gate.me);
  const unlocked = (Number(stat[def.metric]) || 0) >= def.target;
  if (!unlocked) return NextResponse.json({ error: "You haven't unlocked that yet." }, { status: 400 });

  // Idempotent insert — the unique (student_id, achievement_id) stops a re-claim.
  const { error: insErr } = await admin.from("achievement_claims")
    .insert({ student_id: gate.user.id, achievement_id: def.id, points: def.reward });
  if (insErr) {
    if (/duplicate key|unique/i.test(insErr.message)) {
      return NextResponse.json({ ok: true, claimed: true, reward: 0, newTotal: gate.me.reward_points ?? 0 });
    }
    return NextResponse.json({ error: explain(insErr.message) }, { status: 500 });
  }

  const newTotal = Number(gate.me.reward_points ?? 0) + def.reward;
  await admin.from("profiles").update({ reward_points: newTotal }).eq("id", gate.user.id);
  return NextResponse.json({ ok: true, claimed: true, reward: def.reward, newTotal });
}
