import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveStreak } from "@/lib/powerups";
import { streakMilestoneBonus } from "@/lib/earnBonuses";
import { notifyUser } from "@/lib/notify";

// Called once per day when a learner opens their portal. Advances the
// consecutive-day streak: +1 if they were here yesterday, unchanged if already
// counted today, and — new — a single missed day is forgiven if the learner
// holds a Streak Freeze (which is then consumed). A longer gap still resets.
export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: me } = await admin
    .from("profiles").select("streak_count, streak_last_date, role").eq("id", user.id).single();
  if (!me || me.role !== "student") return NextResponse.json({ ok: true, streak: 0 });

  // Streak Freeze stock — best-effort (the column may not be migrated yet).
  const { data: fRow } = await admin.from("profiles").select("streak_freezes").eq("id", user.id).single();
  const freezes = (fRow as any)?.streak_freezes ?? 0;

  const today = new Date().toISOString().slice(0, 10);
  const last = me.streak_last_date ? String(me.streak_last_date).slice(0, 10) : null;

  const res = resolveStreak({ prevStreak: me.streak_count ?? 0, lastDate: last, freezes, today });
  if (res.unchanged) return NextResponse.json({ ok: true, streak: me.streak_count ?? 0 });

  const patch: Record<string, any> = { streak_count: res.streak, streak_last_date: today };
  if (res.keptByFreeze) patch.streak_freezes = Math.max(0, freezes - 1);

  // Streak-milestone payout — the day the streak reaches 7 / 30 / … pays a bonus
  // (added by delta so earned points are never clobbered).
  const bonus = streakMilestoneBonus(res.streak);
  if (bonus > 0) {
    const { data: pts } = await admin.from("profiles").select("reward_points").eq("id", user.id).single();
    patch.reward_points = Number(pts?.reward_points ?? 0) + bonus;
  }

  await admin.from("profiles").update(patch).eq("id", user.id);
  if (bonus > 0) {
    await notifyUser(admin, user.id, {
      title: `🔥 ${res.streak}-day streak!`,
      body: `Nice work — that's worth +${bonus} reward points.`,
      link: "/portal",
    });
  }
  return NextResponse.json({ ok: true, streak: res.streak, keptByFreeze: res.keptByFreeze, bonus });
}
