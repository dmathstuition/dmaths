import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  reward_given: "Reward given",
  notice_emailed: "Announcement emailed",
  student_deleted: "Learner deleted",
  application_approved: "Application approved",
  application_rejected: "Application rejected",
};

function describe(a: any): string {
  const d = a.detail || {};
  switch (a.action) {
    case "reward_given": return `${d.stars}★ reward given`;
    case "notice_emailed": return `Emailed to ${d.ok ?? 0} student(s)${d.failed ? `, ${d.failed} failed` : ""}`;
    case "student_deleted": return `Deleted ${d.name ?? "a learner"}`;
    default: return Object.keys(d).length ? JSON.stringify(d) : "";
  }
}

export default async function ActivityPage() {
  const supa = supabaseServer();
  const { data: logs } = await supa.from("audit_log")
    .select("*, actor:profiles!audit_log_actor_id_fkey(first_name,last_name)")
    .order("created_at", { ascending: false }).limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Activity history</h1>
        <p className="text-sm text-ink/45">The last 100 administrative actions on the portal.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-line">
          {(logs ?? []).map(a => (
            <div key={a.id} className="flex items-start gap-4 px-6 py-4">
              <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{LABELS[a.action] || a.action}</p>
                {describe(a) && <p className="text-sm text-ink/55">{describe(a)}</p>}
                <p className="mt-1 text-xs text-ink/35">
                  {a.actor ? `${a.actor.first_name} ${a.actor.last_name} · ` : ""}
                  {new Date(a.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            </div>
          ))}
          {!logs?.length && <p className="px-6 py-12 text-center text-sm text-ink/40">No activity recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
