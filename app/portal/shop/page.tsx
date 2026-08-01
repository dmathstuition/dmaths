import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import ShopClient from "@/components/portal/ShopClient";
import { spendable } from "@/lib/rewards";
import { learnerAvatar } from "@/lib/avatars";

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

  return <ShopClient earned={earned} balance={balance} items={items ?? []} initialRedemptions={reds ?? []} mascot={learnerAvatar(user!.id)} />;
}
