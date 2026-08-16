import { supabaseServer } from "@/lib/supabase/server";
import RewardsAdminClient from "@/components/admin/RewardsAdminClient";
import HappyHourControl from "@/components/admin/HappyHourControl";
import BossControl from "@/components/admin/BossControl";

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  const supa = supabaseServer();
  const [{ data: items }, { data: pending }] = await Promise.all([
    supa.from("reward_items").select("id, title, description, cost, active").order("created_at", { ascending: false }),
    supa.from("reward_redemptions").select("id, title, cost, status, created_at, student_id")
      .eq("status", "pending").order("created_at", { ascending: true }),
  ]);

  // Attach learner names (kept as a second query to avoid embed ambiguity —
  // reward_redemptions has two FKs to profiles).
  const ids = Array.from(new Set((pending ?? []).map((p: any) => p.student_id).filter(Boolean)));
  const { data: profs } = ids.length
    ? await supa.from("profiles").select("id, first_name, last_name, student_code").in("id", ids)
    : { data: [] as any[] };
  const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
  const pendingWithNames = (pending ?? []).map((p: any) => ({ ...p, student: byId.get(p.student_id) ?? null }));

  return (
    <div className="space-y-6">
      <BossControl />
      <HappyHourControl />
      <RewardsAdminClient initialItems={items ?? []} initialPending={pendingWithNames} />
    </div>
  );
}
