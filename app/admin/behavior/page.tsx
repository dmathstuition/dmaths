import { supabaseServer } from "@/lib/supabase/server";
import BehaviorOverviewClient from "@/components/admin/BehaviorOverviewClient";

export const dynamic = "force-dynamic";

export default async function BehaviorPage() {
  const supa = supabaseServer();
  const { data: logs } = await supa
    .from("behavior_logs")
    .select("*, behavior_type:behavior_types(name,category,points,color), student:profiles(first_name,last_name,student_code)")
    .order("created_at", { ascending: false })
    .limit(80);

  return <BehaviorOverviewClient logs={logs ?? []} />;
}
