import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import BadgesClient from "@/components/portal/BadgesClient";

export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const [{ data: allBadges }, { data: earned }] = await Promise.all([
    supa.from("badges").select("*").order("points_threshold", { ascending: true, nullsFirst: false }),
    supa.from("student_badges").select("badge_id, earned_at").eq("student_id", me!.id),
  ]);

  return <BadgesClient allBadges={allBadges ?? []} earned={earned ?? []} rewardPoints={me?.reward_points ?? 0} />;
}
