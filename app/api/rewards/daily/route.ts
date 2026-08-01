import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rollDailyReward, watDay } from "@/lib/dailyReward";

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, points: me?.reward_points ?? 0 };
}

// Has today's chest already been opened?
export async function GET() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const { data } = await admin.from("daily_rewards")
    .select("points").eq("student_id", gate.user.id).eq("day", watDay()).maybeSingle();
  return NextResponse.json({ claimedToday: !!data, points: data?.points ?? null });
}

// Open today's chest → credit bonus reward points (once per day).
export async function POST() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const day = watDay();

  const { data: existing } = await admin.from("daily_rewards")
    .select("points").eq("student_id", gate.user.id).eq("day", day).maybeSingle();
  if (existing) return NextResponse.json({ error: "Already opened today", claimedToday: true, points: existing.points }, { status: 409 });

  const points = rollDailyReward();
  const { error: insErr } = await admin.from("daily_rewards")
    .insert({ student_id: gate.user.id, day, points });
  if (insErr) {
    // Unique-violation = a concurrent claim already landed → treat as claimed.
    if (/duplicate|unique/i.test(insErr.message)) {
      return NextResponse.json({ error: "Already opened today", claimedToday: true }, { status: 409 });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const total = Number(gate.points) + points;
  await admin.from("profiles").update({ reward_points: total }).eq("id", gate.user.id);

  return NextResponse.json({ ok: true, points, total });
}
