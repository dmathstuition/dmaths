import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import BehaviorClient from "@/components/portal/BehaviorClient";

export const dynamic = "force-dynamic";

export default async function BehaviorPage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const [{ data: logs }, { data: types }] = await Promise.all([
    supa.from("behavior_logs")
      .select("*")
      .eq("student_id", me!.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supa.from("behavior_types").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <BehaviorClient
      rewardPoints={me?.reward_points ?? 0}
      sanctionPoints={me?.sanction_points ?? 0}
      logs={logs ?? []}
      behaviorTypes={types ?? []}
    />
  );
}
