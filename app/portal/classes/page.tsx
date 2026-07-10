import Link from "next/link";
import JoinClassButton from "@/components/portal/JoinClassButton";
import { supabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/Icons";
import EmptyState from "@/components/ui/EmptyState";
import { fmtWAT } from "@/lib/time";

export const dynamic = "force-dynamic";

// A small palette so each subject gets a consistent coloured avatar.
const AVATAR_COLORS = ["#1A60AB", "#EFAE56", "#7BA3CA", "#059669", "#8b5cf6", "#ec4899"];
function avatarColor(subject: string) {
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function MyClasses() {
  const supa = supabaseServer();
  // RLS already limits this to classes the student is assigned to
  const { data: classes } = await supa.from("classes").select("*").order("starts_at");

  const now = Date.now();
  const withStatus = (classes ?? []).map(c => {
    const start = new Date(c.starts_at).getTime();
    const mins = (start - now) / 60000;
    const status = mins < 0 ? "past" : mins <= 30 ? "soon" : "upcoming";
    return { ...c, _status: status as "past" | "soon" | "upcoming", _start: start };
  });
  // Upcoming first (soonest first), past last (most recent first).
  withStatus.sort((a, b) => {
    const ap = a._status === "past", bp = b._status === "past";
    if (ap !== bp) return ap ? 1 : -1;
    return ap ? b._start - a._start : a._start - b._start;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">My classes</h1>
        <p className="text-sm text-ink/45">Your live sessions — join right from here.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {withStatus.map(c => {
          const past = c._status === "past";
          return (
            <div key={c.id} className={`card p-5 ${past && !c.recording_url ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-white"
                  style={{ background: avatarColor(c.subject) }}
                >
                  {c.subject?.[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-base font-bold leading-tight">{c.subject}</h2>
                    {c._status === "soon" ? (
                      <span className="badge-pulse pill bg-gold text-board">Starting soon</span>
                    ) : c._status === "upcoming" ? (
                      <span className="pill-blue">Upcoming</span>
                    ) : (
                      <span className="pill bg-ink/10 text-ink/50">Past</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-ink/50">with {c.tutor} · {c.platform}</p>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-ink/65">
                <p className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-ink/35" />
                  {fmtWAT(c.starts_at)}
                </p>
                <p className="flex items-center gap-2">
                  <Icon name="classes" className="h-4 w-4 text-ink/35" />
                  {c.duration_minutes} minutes
                </p>
              </div>

              {!past && (c.link
                ? <JoinClassButton classId={c.id} link={c.link} className="btn-gold mt-4 inline-block w-full text-center" />
                : <p className="mt-4 rounded-xl bg-chalk px-4 py-2.5 text-center text-sm font-semibold text-ink/45">Class link coming soon</p>)}

              {/* In-portal live classroom — video & screen share, no Zoom/Meet needed */}
              {!past && (
                <Link href={`/portal/class/${c.id}/live`}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink/70 transition hover:border-gold hover:text-gold-deep">
                  🔴 Join live in the app
                </Link>
              )}

              {/* Rewatch the lesson once the admin attaches a recording */}
              {past && c.recording_url && (
                <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                  className="btn-ink mt-4 block w-full text-center">
                  ▶ Watch recording
                </a>
              )}
            </div>
          );
        })}
        {!withStatus.length && (
          <div className="md:col-span-2">
            <EmptyState icon="classes" title="No classes scheduled yet"
              body="Your live sessions will show up here as soon as your tutor assigns you to a class. You'll also get a reminder before each one starts." />
          </div>
        )}
      </div>
    </div>
  );
}
