import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable } from "@/lib/rewards";
import { dealForDay, watDayNumber, discountedCost } from "@/lib/shopDeals";
import { tierFor } from "@/lib/vip";

// POST { itemId } — a learner spends points on a shop item. The balance check
// runs server-side with the service-role client so it can't be bypassed.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role, reward_points").eq("id", user.id).single();
  if (me?.role !== "student") return NextResponse.json({ error: "Only learners can redeem." }, { status: 403 });

  const { itemId } = await req.json().catch(() => ({ itemId: null }));
  if (!itemId || typeof itemId !== "string") return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: item } = await admin.from("reward_items").select("id, title, cost, active").eq("id", itemId).maybeSingle();
  if (!item || !item.active) return NextResponse.json({ error: "That reward isn't available." }, { status: 404 });

  // Price = the biggest discount the learner is owed, recomputed server-side so
  // it can't be spoofed: the Deal of the Day (if this is today's item) OR their
  // standing VIP-tier discount — whichever is larger (they don't stack).
  const { data: active } = await admin.from("reward_items").select("id, cost").eq("active", true);
  const deal = dealForDay(active ?? [], watDayNumber());
  const dealPct = deal && deal.itemId === item.id ? deal.discountPct : 0;
  const tierPct = tierFor(me?.reward_points ?? 0).discountPct;
  const pct = Math.max(dealPct, tierPct);
  const price = discountedCost(item.cost, pct);

  const { data: reds } = await admin.from("reward_redemptions").select("cost, status").eq("student_id", user.id);
  const bal = spendable(me?.reward_points ?? 0, reds ?? []);
  if (price > bal) {
    return NextResponse.json({ error: `Not enough points — you have ${bal}, this costs ${price}.` }, { status: 400 });
  }

  // Snapshot the reason for the discount in the title so the receipt is honest.
  const reason = pct === 0 ? "" : dealPct >= tierPct ? ` (Deal of the Day −${dealPct}%)` : ` (VIP −${tierPct}%)`;
  const title = `${item.title}${reason}`;
  const { data: red, error } = await admin.from("reward_redemptions").insert({
    student_id: user.id, item_id: item.id, title, cost: price, status: "pending",
  }).select("id, title, cost, status, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "reward_redeemed", detail: { itemId: item.id, title: item.title, cost: price, discountPct: pct },
  });

  return NextResponse.json({ ok: true, redemption: red, spendable: bal - price });
}
