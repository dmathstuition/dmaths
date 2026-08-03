import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import ShopClient from "@/components/portal/ShopClient";
import PowerUps from "@/components/portal/PowerUps";
import { spendable } from "@/lib/rewards";
import { learnerAvatarFor } from "@/lib/avatars";
import { dealForDay, dealExpiry, watDayNumber } from "@/lib/shopDeals";
import { tierFor, nextTier } from "@/lib/vip";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getUser();
  const me = await getProfile();
  const supa = supabaseServer();
  const [{ data: items }, { data: reds }] = await Promise.all([
    // Error harmlessly to null before migration-rewards-shop.sql is run.
    supa.from("reward_items").select("id, title, description, cost").eq("active", true).order("cost", { ascending: true }),
    supa.from("reward_redemptions").select("id, title, cost, status, created_at")
      .eq("student_id", user!.id).order("created_at", { ascending: false }),
  ]);

  const earned = Number((me as any)?.reward_points ?? 0);
  const balance = spendable(earned, reds ?? []);

  // Deal of the Day — one item discounted until the next WAT midnight.
  const deal = dealForDay(items ?? [], watDayNumber());
  const dealInfo = deal ? { ...deal, expiresAt: dealExpiry() } : null;

  // VIP tier — a lifetime-earnings status that grants a standing discount.
  const tier = tierFor(earned);
  const { next, remaining } = nextTier(earned);
  const vip = { name: tier.name, color: tier.color, discountPct: tier.discountPct, nextName: next?.name ?? null, remaining };

  return (
    <div className="space-y-6">
      <ShopClient earned={earned} balance={balance} items={items ?? []} initialRedemptions={reds ?? []}
        mascot={learnerAvatarFor(user!.id, (me as any)?.avatar_choice)} deal={dealInfo} vip={vip} />
      <PowerUps />
    </div>
  );
}
