import { supabaseServer } from "@/lib/supabase/server";
import BehaviorOverviewClient from "@/components/admin/BehaviorOverviewClient";

export const dynamic = "force-dynamic";

export default async function BehaviorPage() {
  const supa = supabaseServer();

  const { data: rawLogs } = await supa
    .from("behavior_logs")
    .select("id,student_id,behavior_type_id,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  const typeIds = [...new Set((rawLogs ?? []).map(l => l.behavior_type_id))];
  const studentIds = [...new Set((rawLogs ?? []).map(l => l.student_id))];

  const [{ data: types }, { data: students }] = await Promise.all([
    typeIds.length
      ? supa.from("behavior_types").select("id,name,category,points,color").in("id", typeIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? supa.from("profiles").select("id,first_name,last_name,student_code").in("id", studentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const typeMap = new Map((types ?? []).map((t: any) => [t.id, t]));
  const studentMap = new Map((students ?? []).map((s: any) => [s.id, s]));

  const logs = (rawLogs ?? []).map(l => ({
    ...l,
    behavior_type: typeMap.get(l.behavior_type_id) ?? null,
    student: studentMap.get(l.student_id) ?? null,
  }));

  return <BehaviorOverviewClient logs={logs} />;
}
