import { Icon } from "@/components/Icons";
import NoChildren from "@/components/parent/NoChildren";
import { getParentChildren, childName } from "@/lib/parentAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fmtWATDate, fmtWATTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ParentCalendarPage() {
  const ctx = await getParentChildren();
  if (!ctx) return null;
  if (!ctx.children.length) return <NoChildren />;

  const admin = supabaseAdmin();
  const ids = ctx.children.map((c) => c.id);
  const { data: links } = await admin.from("class_students").select("class_id, student_id").in("student_id", ids);
  const classIds = Array.from(new Set((links ?? []).map((l: any) => l.class_id)));

  const { data: classes } = classIds.length
    ? await admin.from("classes")
        .select("id, subject, tutor, starts_at, duration_minutes, mode, location, platform")
        .in("id", classIds).order("starts_at", { ascending: true })
    : { data: [] as any[] };

  const now = Date.now();
  const rows = classes ?? [];
  const upcoming = rows.filter((c: any) => new Date(c.starts_at).getTime() >= now - 2 * 3600_000);
  const past = rows.filter((c: any) => new Date(c.starts_at).getTime() < now - 2 * 3600_000).reverse().slice(0, 15);
  const nameFor = (classId: string) => {
    const sid = (links ?? []).find((l: any) => l.class_id === classId)?.student_id;
    const child = ctx.children.find((c) => c.id === sid);
    return child ? childName(child) : "";
  };

  return (
    <div className="space-y-6">
      <Hero title="Class calendar" subtitle="Every lesson scheduled for your child." icon="calendar" />
      <Section title={`Upcoming (${upcoming.length})`} rows={upcoming} nameFor={nameFor} empty="No upcoming classes scheduled." />
      {past.length > 0 && <Section title="Recent" rows={past} nameFor={nameFor} empty="" muted />}
    </div>
  );
}

function Hero({ title, subtitle, icon }: { title: string; subtitle: string; icon: any }) {
  return (
    <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-white/50">{subtitle}</p>
      </div>
    </div>
  );
}

function Section({ title, rows, nameFor, empty, muted }: {
  title: string; rows: any[]; nameFor: (id: string) => string; empty: string; muted?: boolean;
}) {
  return (
    <div className="card neu-card overflow-hidden">
      <div className="border-b border-line px-6 py-4"><h2 className="font-display text-lg font-semibold text-ink">{title}</h2></div>
      {rows.length ? (
        <div className="divide-y divide-line/60">
          {rows.map((c) => (
            <div key={c.id} className={`flex flex-wrap items-center gap-3 px-5 py-3.5 ${muted ? "opacity-70" : ""}`}>
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                <Icon name="classes" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{c.subject} <span className="font-normal text-ink/40">· {nameFor(c.id)}</span></p>
                <p className="text-xs text-ink/50">{fmtWATDate(c.starts_at)} · {fmtWATTime(c.starts_at)} · {c.duration_minutes} min</p>
                {c.mode === "physical" && c.location && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-gold-deep">
                    <Icon name="mapPin" className="h-3 w-3" /> {c.location}
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 text-xs font-semibold text-ink/45">
                {c.mode === "physical" ? "In-person" : c.platform}
              </span>
            </div>
          ))}
        </div>
      ) : <p className="p-6 text-center text-sm text-ink/40">{empty}</p>}
    </div>
  );
}
