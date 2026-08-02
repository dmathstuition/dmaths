import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable as spendableFn } from "@/lib/rewards";
import { frameByKey, isFree, canUnlock, characterByKey } from "@/lib/cosmetics";

// Avatar Studio. Characters are free; premium frames are bought with reward
// points. A purchase is recorded as a normal reward_redemptions row (item_id
// null, status fulfilled) so the spendable balance drops exactly like a shop
// purchase — reward_points (the leaderboard total) is never touched. Ownership
// of premium frames is tracked in learner_cosmetics; the equipped character &
// frame live on the profile.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*(learner_cosmetics|reward_redemptions)|column .*avatar_/i.test(m)
    ? "Avatar Studio needs migration-avatar-studio.sql (and the rewards shop) — run them in Supabase."
    : m;

async function learner() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: me } = await supa.from("profiles")
    .select("role, reward_points, avatar_choice, avatar_frame").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, me };
}

// Spendable balance + owned premium frames + what's equipped.
async function snapshot(admin: ReturnType<typeof supabaseAdmin>, userId: string, rewardPoints: number) {
  const [{ data: reds }, { data: owned }] = await Promise.all([
    admin.from("reward_redemptions").select("cost, status").eq("student_id", userId),
    admin.from("learner_cosmetics").select("key").eq("student_id", userId).eq("kind", "frame"),
  ]);
  return {
    spendable: spendableFn(rewardPoints, reds ?? []),
    ownedFrames: (owned ?? []).map((r: any) => r.key),
  };
}

export async function GET() {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  try {
    const snap = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0);
    return NextResponse.json({
      ...snap,
      equipped: { character: gate.me.avatar_choice ?? null, frame: gate.me.avatar_frame ?? "none" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: explain(e?.message ?? "load failed"), spendable: 0, ownedFrames: [], equipped: { character: null, frame: "none" } }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  // ── Equip a character and/or frame ─────────────────────────────
  if (action === "equip") {
    const update: Record<string, string | null> = {};
    if ("character" in (body ?? {})) {
      const key = body.character;
      if (key !== null && !characterByKey(key)) return NextResponse.json({ error: "Unknown character." }, { status: 400 });
      update.avatar_choice = key ?? null;
    }
    if ("frame" in (body ?? {})) {
      const key = String(body.frame ?? "none");
      const frame = frameByKey(key);
      if (frame.key !== key) return NextResponse.json({ error: "Unknown frame." }, { status: 400 });
      if (!isFree(key)) {
        const { data: owned } = await admin.from("learner_cosmetics")
          .select("key").eq("student_id", gate.user.id).eq("kind", "frame").eq("key", key).maybeSingle();
        if (!owned) return NextResponse.json({ error: "You don't own that frame yet." }, { status: 403 });
      }
      update.avatar_frame = key;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to equip." }, { status: 400 });

    const { error } = await admin.from("profiles").update(update).eq("id", gate.user.id);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, equipped: update });
  }

  // ── Unlock (buy) a premium frame ───────────────────────────────
  if (action === "unlock") {
    const key = String(body?.frame ?? "");
    const frame = frameByKey(key);
    if (frame.key !== key || isFree(key)) return NextResponse.json({ error: "That frame can't be purchased." }, { status: 400 });

    // Already owned?
    const { data: already } = await admin.from("learner_cosmetics")
      .select("id").eq("student_id", gate.user.id).eq("kind", "frame").eq("key", key).maybeSingle();
    if (already) return NextResponse.json({ error: "You already own that frame." }, { status: 409 });

    let snap;
    try { snap = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0); }
    catch (e: any) { return NextResponse.json({ error: explain(e?.message ?? "load failed") }, { status: 500 }); }

    if (!canUnlock(snap.spendable, frame.cost)) {
      return NextResponse.json({ error: `Not enough points — you need ${frame.cost} to spend.` }, { status: 400 });
    }

    // Spend via the shop ledger, then record ownership and auto-equip it.
    const { error: rErr } = await admin.from("reward_redemptions").insert({
      student_id: gate.user.id, item_id: null, title: `Frame · ${frame.name}`, cost: frame.cost, status: "fulfilled",
    });
    if (rErr) return NextResponse.json({ error: explain(rErr.message) }, { status: 500 });

    await admin.from("learner_cosmetics").insert({ student_id: gate.user.id, kind: "frame", key });
    await admin.from("profiles").update({ avatar_frame: key }).eq("id", gate.user.id);

    const after = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0);
    return NextResponse.json({ ok: true, spendable: after.spendable, ownedFrames: after.ownedFrames, equipped: { frame: key } });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
