import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable } from "@/lib/rewards";
import { dealForDay, watDayNumber } from "@/lib/shopDeals";

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

  // Deal of the Day: recompute today's featured item server-side from the active
  // catalogue so the discount can't be spoofed, and charge the discounted price.
  const { data: active } = await admin.from("reward_items").select("id, cost").eq("active", true);
  const deal = dealForDay(active ?? [], watDayNumber());
  const price = deal && deal.itemId === item.id ? deal.price : item.cost;
  const onDeal = price !== item.cost;

  const { data: reds } = await admin.from("reward_redemptions").select("cost, status").eq("student_id", user.id);
  const bal = spendable(me?.reward_points ?? 0, reds ?? []);
  if (price > bal) {
    return NextResponse.json({ error: `Not enough points — you have ${bal}, this costs ${price}.` }, { status: 400 });
  }

  // Snapshot the deal in the title so the receipt reads honestly.
  const title = onDeal ? `${item.title} (Deal of the Day −${deal!.discountPct}%)` : item.title;
  const { data: red, error } = await admin.from("reward_redemptions").insert({
    student_id: user.id, item_id: item.id, title, cost: price, status: "pending",
  }).select("id, title, cost, status, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "reward_redeemed", detail: { itemId: item.id, title: item.title, cost: price, onDeal },
  });

  return NextResponse.json({ ok: true, redemption: red, spendable: bal - price });
}
