import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { spendable } from "@/lib/rewards";

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

  const { data: reds } = await admin.from("reward_redemptions").select("cost, status").eq("student_id", user.id);
  const bal = spendable(me?.reward_points ?? 0, reds ?? []);
  if (item.cost > bal) {
    return NextResponse.json({ error: `Not enough points — you have ${bal}, this costs ${item.cost}.` }, { status: 400 });
  }

  const { data: red, error } = await admin.from("reward_redemptions").insert({
    student_id: user.id, item_id: item.id, title: item.title, cost: item.cost, status: "pending",
  }).select("id, title, cost, status, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "reward_redeemed", detail: { itemId: item.id, title: item.title, cost: item.cost },
  });

  return NextResponse.json({ ok: true, redemption: red, spendable: bal - item.cost });
}
