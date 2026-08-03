import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable as spendableFn } from "@/lib/rewards";
import { POWERUPS, powerUpByKey, boostActive, BOOST_MS } from "@/lib/powerups";

// Power-ups shop. Buying spends via the reward_redemptions ledger (so the
// spendable balance drops but reward_points — the leaderboard total — is never
// touched), then applies the effect on the profile.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /column .*(streak_freezes|boost_until)/i.test(m)
    ? "Power-ups need migration-powerups.sql — run it in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles")
    .select("role, reward_points, streak_freezes, boost_until").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, me };
}

async function spendable(admin: ReturnType<typeof supabaseAdmin>, userId: string, points: number) {
  const { data: reds } = await admin.from("reward_redemptions").select("cost, status").eq("student_id", userId);
  return spendableFn(points, reds ?? []);
}

export async function GET() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const bal = await spendable(admin, gate.user.id, gate.me.reward_points ?? 0);
  return NextResponse.json({
    powerups: POWERUPS,
    spendable: bal,
    freezes: (gate.me as any).streak_freezes ?? 0,
    boostUntil: (gate.me as any).boost_until ?? null,
  });
}

export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => null);
  const item = powerUpByKey(String(body?.key ?? ""));
  if (!item) return NextResponse.json({ error: "Unknown power-up." }, { status: 400 });

  // Don't let a boost be stacked while one is already running.
  if (item.key === "boost" && boostActive((gate.me as any).boost_until)) {
    return NextResponse.json({ error: "A boost is already active — enjoy it first!" }, { status: 409 });
  }

  const bal = await spendable(admin, gate.user.id, gate.me.reward_points ?? 0);
  if (bal < item.cost) {
    return NextResponse.json({ error: `Not enough points — ${item.name} costs ${item.cost}, you have ${bal}.` }, { status: 400 });
  }

  const { error: rErr } = await admin.from("reward_redemptions").insert({
    student_id: gate.user.id, item_id: null, title: `Power-up · ${item.name}`, cost: item.cost, status: "fulfilled",
  });
  if (rErr) return NextResponse.json({ error: explain(rErr.message) }, { status: 500 });

  // Apply the effect.
  const patch: Record<string, any> = {};
  if (item.key === "freeze") patch.streak_freezes = ((gate.me as any).streak_freezes ?? 0) + 1;
  if (item.key === "boost") patch.boost_until = new Date(Date.now() + BOOST_MS).toISOString();
  const { error: uErr } = await admin.from("profiles").update(patch).eq("id", gate.user.id);
  if (uErr) return NextResponse.json({ error: explain(uErr.message) }, { status: 500 });

  const after = await spendable(admin, gate.user.id, gate.me.reward_points ?? 0);
  return NextResponse.json({
    ok: true,
    spendable: after,
    freezes: item.key === "freeze" ? patch.streak_freezes : ((gate.me as any).streak_freezes ?? 0),
    boostUntil: item.key === "boost" ? patch.boost_until : ((gate.me as any).boost_until ?? null),
  });
}
