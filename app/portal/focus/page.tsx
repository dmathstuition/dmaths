import FocusTimer from "@/components/portal/FocusTimer";
import ActivityHeatmap from "@/components/portal/ActivityHeatmap";
import { Icon } from "@/components/Icons";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const supa = supabaseServer();
  const me = await getProfile();

  // RLS scopes this to the signed-in learner. Errors harmlessly to null before
  // migration-study-sessions.sql has been run.
  const { data: sessions } = await supa
    .from("study_sessions").select("minutes, created_at").order("created_at", { ascending: false }).limit(500);

  const rows = sessions ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const sum = (f: (d: string) => boolean) =>
    rows.filter((r: any) => f(String(r.created_at).slice(0, 10))).reduce((a: number, r: any) => a + (r.minutes ?? 0), 0);

  const todayMins = sum((d) => d === today);
  const weekMins = sum((d) => d >= weekAgo);
  const totalMins = rows.reduce((a: number, r: any) => a + (r.minutes ?? 0), 0);
  const dates = rows.map((r: any) => String(r.created_at).slice(0, 10));

  return (
    <div className="space-y-6">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="zap" className="h-6 w-6" /></div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name="target" className="h-5 w-5" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="zap" className="h-6 w-6" />
        </span>
        <div className="relative">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Focus mode</h1>
          <p className="mt-1 text-sm text-white/50">Study in focused bursts — your minutes are tracked and build your streak.</p>
        </div>
      </div>

      <FocusTimer subjects={(me as any)?.subjects ?? []} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today" value={todayMins} />
        <Stat label="This week" value={weekMins} />
        <Stat label="All time" value={totalMins} />
      </div>

      <ActivityHeatmap dates={dates} />
    </div>
  );
}

function fmt(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card neu-card p-5">
      <p className="font-display text-3xl font-bold text-ink">{fmt(value)}</p>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/40">{label} focused</p>
    </div>
  );
}
