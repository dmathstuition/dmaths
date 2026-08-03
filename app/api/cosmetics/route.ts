import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable as spendableFn } from "@/lib/rewards";
import { titleByKey, isFreeTitle, canUnlock, characterByKey, rollCrate, CRATE_COST, isGiftableTitle } from "@/lib/cosmetics";
import { notifyUser } from "@/lib/notify";

// Avatar Studio. Characters are free; premium name TITLES are bought with reward
// points. A purchase is recorded as a normal reward_redemptions row (item_id
// null, status fulfilled) so the spendable balance drops exactly like a shop
// purchase — reward_points (the leaderboard total) is never touched. Ownership
// of premium titles is tracked in learner_cosmetics; the equipped character &
// title live on the profile.
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
    .select("role, first_name, reward_points, avatar_choice, avatar_title").eq("id", user.id).single();
  if (me?.role !== "student") return { error: NextResponse.json({ error: "Learners only" }, { status: 403 }) };
  return { user, me };
}

// Spendable balance + owned premium titles + what's equipped.
async function snapshot(admin: ReturnType<typeof supabaseAdmin>, userId: string, rewardPoints: number) {
  const [{ data: reds }, { data: owned }] = await Promise.all([
    admin.from("reward_redemptions").select("cost, status").eq("student_id", userId),
    admin.from("learner_cosmetics").select("key").eq("student_id", userId).eq("kind", "title"),
  ]);
  return {
    spendable: spendableFn(rewardPoints, reds ?? []),
    ownedTitles: (owned ?? []).map((r: any) => r.key),
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
      equipped: { character: gate.me.avatar_choice ?? null, title: gate.me.avatar_title ?? "none" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: explain(e?.message ?? "load failed"), spendable: 0, ownedTitles: [], equipped: { character: null, title: "none" } }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const gate = await learner();
  if ("error" in gate) return gate.error;
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");

  // ── Equip a character and/or title ─────────────────────────────
  if (action === "equip") {
    const update: Record<string, string | null> = {};
    if ("character" in (body ?? {})) {
      const key = body.character;
      if (key !== null && !characterByKey(key)) return NextResponse.json({ error: "Unknown character." }, { status: 400 });
      update.avatar_choice = key ?? null;
    }
    if ("title" in (body ?? {})) {
      const key = String(body.title ?? "none");
      const title = titleByKey(key);
      if (title.key !== key) return NextResponse.json({ error: "Unknown title." }, { status: 400 });
      if (!isFreeTitle(key)) {
        const { data: owned } = await admin.from("learner_cosmetics")
          .select("key").eq("student_id", gate.user.id).eq("kind", "title").eq("key", key).maybeSingle();
        if (!owned) return NextResponse.json({ error: "You don't own that title yet." }, { status: 403 });
      }
      update.avatar_title = key;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to equip." }, { status: 400 });

    const { error } = await admin.from("profiles").update(update).eq("id", gate.user.id);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, equipped: update });
  }

  // ── Unlock (buy) a premium title ───────────────────────────────
  if (action === "unlock") {
    const key = String(body?.title ?? "");
    const title = titleByKey(key);
    if (title.key !== key || isFreeTitle(key)) return NextResponse.json({ error: "That title can't be purchased." }, { status: 400 });

    // Already owned?
    const { data: already } = await admin.from("learner_cosmetics")
      .select("id").eq("student_id", gate.user.id).eq("kind", "title").eq("key", key).maybeSingle();
    if (already) return NextResponse.json({ error: "You already own that title." }, { status: 409 });

    let snap;
    try { snap = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0); }
    catch (e: any) { return NextResponse.json({ error: explain(e?.message ?? "load failed") }, { status: 500 }); }

    if (!canUnlock(snap.spendable, title.cost)) {
      return NextResponse.json({ error: `Not enough points — you need ${title.cost} to spend.` }, { status: 400 });
    }

    // Spend via the shop ledger, then record ownership and auto-equip it.
    const { error: rErr } = await admin.from("reward_redemptions").insert({
      student_id: gate.user.id, item_id: null, title: `Title · ${title.label}`, cost: title.cost, status: "fulfilled",
    });
    if (rErr) return NextResponse.json({ error: explain(rErr.message) }, { status: 500 });

    await admin.from("learner_cosmetics").insert({ student_id: gate.user.id, kind: "title", key });
    await admin.from("profiles").update({ avatar_title: key }).eq("id", gate.user.id);

    const after = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0);
    return NextResponse.json({ ok: true, spendable: after.spendable, ownedTitles: after.ownedTitles, equipped: { title: key } });
  }

  // ── Open a Mystery Crate (rolls a random unowned title) ────────
  if (action === "crate") {
    let snap;
    try { snap = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0); }
    catch (e: any) { return NextResponse.json({ error: explain(e?.message ?? "load failed") }, { status: 500 }); }

    if (snap.spendable < CRATE_COST) {
      return NextResponse.json({ error: `Not enough points — a crate costs ${CRATE_COST}, you have ${snap.spendable}.` }, { status: 400 });
    }

    const rolled = rollCrate(snap.ownedTitles);
    if (!rolled) return NextResponse.json({ error: "You've already collected every title! 🏆" }, { status: 409 });

    // Spend via the shop ledger, record ownership, and auto-equip the new title.
    const { error: rErr } = await admin.from("reward_redemptions").insert({
      student_id: gate.user.id, item_id: null, title: `Mystery Crate · ${rolled.label}`, cost: CRATE_COST, status: "fulfilled",
    });
    if (rErr) return NextResponse.json({ error: explain(rErr.message) }, { status: 500 });

    await admin.from("learner_cosmetics").insert({ student_id: gate.user.id, kind: "title", key: rolled.key });
    await admin.from("profiles").update({ avatar_title: rolled.key }).eq("id", gate.user.id);

    const after = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0);
    return NextResponse.json({
      ok: true,
      rolled: { key: rolled.key, label: rolled.label, rarity: rolled.rarity },
      spendable: after.spendable,
      ownedTitles: after.ownedTitles,
      equipped: { title: rolled.key },
    });
  }

  // ── Gift a title to a friend (by Student ID) ───────────────────
  if (action === "gift") {
    const key = String(body?.title ?? "");
    const code = String(body?.toCode ?? "").trim().toUpperCase();
    const title = titleByKey(key);
    if (!isGiftableTitle(key)) return NextResponse.json({ error: "That title can't be gifted." }, { status: 400 });
    if (!code) return NextResponse.json({ error: "Enter your friend's Student ID." }, { status: 400 });

    // Resolve the recipient — must be a real, active learner, and not yourself.
    const { data: recipient } = await admin.from("profiles")
      .select("id, first_name, role, is_active").eq("student_code", code).maybeSingle();
    if (!recipient || recipient.role !== "student" || recipient.is_active === false) {
      return NextResponse.json({ error: "No active learner found with that Student ID." }, { status: 404 });
    }
    if (recipient.id === gate.user.id) return NextResponse.json({ error: "You can't gift a title to yourself." }, { status: 400 });

    // Skip if they already own it (don't charge the gifter for nothing).
    const { data: already } = await admin.from("learner_cosmetics")
      .select("id").eq("student_id", recipient.id).eq("kind", "title").eq("key", key).maybeSingle();
    if (already) return NextResponse.json({ error: `${recipient.first_name || "They"} already owns that title.` }, { status: 409 });

    // The gifter pays from their own spendable balance.
    let snap;
    try { snap = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0); }
    catch (e: any) { return NextResponse.json({ error: explain(e?.message ?? "load failed") }, { status: 500 }); }
    if (!canUnlock(snap.spendable, title.cost)) {
      return NextResponse.json({ error: `Not enough points — a ${title.label} gift costs ${title.cost}, you have ${snap.spendable}.` }, { status: 400 });
    }

    // Spend on the gifter's ledger, grant ownership to the recipient (never
    // equipped for them, never touches their leaderboard total), and notify them.
    const { error: rErr } = await admin.from("reward_redemptions").insert({
      student_id: gate.user.id, item_id: null, title: `Gift · ${title.label} → ${code}`, cost: title.cost, status: "fulfilled",
    });
    if (rErr) return NextResponse.json({ error: explain(rErr.message) }, { status: 500 });

    await admin.from("learner_cosmetics").insert({ student_id: recipient.id, kind: "title", key });
    await notifyUser(admin, recipient.id, {
      title: "🎁 You got a gift!",
      body: `${gate.me.first_name || "A friend"} sent you the "${title.label}" title. Equip it in Avatar Studio.`,
      link: "/portal/style",
    });

    const after = await snapshot(admin, gate.user.id, gate.me.reward_points ?? 0);
    return NextResponse.json({ ok: true, spendable: after.spendable, gifted: { label: title.label, to: recipient.first_name || code } });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
