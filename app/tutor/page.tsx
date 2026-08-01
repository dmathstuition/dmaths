import Link from "next/link";
import { getUser, getProfile } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fmtWATTime, fmtWATDate } from "@/lib/time";
import { Icon, type IconName } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";

export const dynamic = "force-dynamic";

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function TutorDashboard() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  const admin = supabaseAdmin();
  const uid = user?.id ?? "";

  const [rosterIds, { data: classes }, { data: unread }] = await Promise.all([
    uid ? getRoster(uid) : Promise.resolve([]),
    admin.from("classes").select("*").eq("tutor_id", uid).order("starts_at", { ascending: true }),
    admin.from("messages").select("id").eq("student_id", uid).eq("sender_role", "admin").eq("read", false),
  ]);

  const now = Date.now();
  const todayWAT = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const upcoming = (classes ?? []).filter((c: any) => new Date(c.starts_at).getTime() >= now - 2 * 60 * 60 * 1000);
  const todays = (classes ?? []).filter(
    (c: any) => new Date(c.starts_at).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }) === todayWAT
  );
  const next = upcoming[0];
  const firstName = (profile?.first_name ?? "there").split(" ")[0];
  const unreadCount = (unread ?? []).length;
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6 py-2">
      {/* Greeting HUD */}
      <Reveal>
        <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white sm:p-8"
          style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
          <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/25 float"><Icon name="graduationCap" className="h-6 w-6" /></div>
          <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/20 float" style={{ animationDelay: "1.1s" }}><Icon name="sparkles" className="h-5 w-5" /></div>
          <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <Icon name="school" className="h-6 w-6" />
          </span>
          <div className="relative min-w-0">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{greeting()}, {firstName} 👋</h1>
            <p className="mt-1 text-sm text-white/55">Your teaching at a glance.</p>
            <p className="mt-2 hidden font-mono text-[11px] uppercase tracking-[.2em] text-white/35 sm:block">{today}</p>
          </div>
        </div>
      </Reveal>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Reveal delay={0}><StatCard href="/tutor/learners" icon="students" label="My learners" value={rosterIds.length} tint="blue" sub="assigned to you" /></Reveal>
        <Reveal delay={60}><StatCard href="/tutor/classes" icon="classes" label="Upcoming classes" value={upcoming.length} tint="gold" sub="scheduled" /></Reveal>
        <Reveal delay={120}><StatCard href="/tutor/messages" icon="messages" label="Unread from admin" value={unreadCount} tint={unreadCount > 0 ? "amber" : "emerald"} sub={unreadCount > 0 ? "needs a reply" : "all caught up"} /></Reveal>
      </div>

      {/* Next class */}
      <Reveal delay={80}>
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-line/60 px-6 py-3">
            <Icon name="clock" className="h-4 w-4 text-gold-deep" />
            <h2 className="font-display text-base font-semibold text-ink">Next class</h2>
          </div>
          <div className="p-6">
            {next ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="pill-blue">{next.subject}</span>
                  <p className="mt-1.5 font-display text-lg font-bold text-ink">
                    {fmtWATDate(next.starts_at)} · {fmtWATTime(next.starts_at)}
                  </p>
                  <p className="text-xs text-ink/45">{next.platform} · {next.duration_minutes} min</p>
                </div>
                {next.link && (
                  <a href={next.link} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[42px] !px-6">
                    Join class →
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink/45">No upcoming classes assigned to you.</p>
            )}
          </div>
        </div>
      </Reveal>

      {/* Today's schedule */}
      {todays.length > 0 && (
        <Reveal delay={100}>
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-line/60 px-6 py-3">
              <Icon name="calendar" className="h-4 w-4 text-gold-deep" />
              <h2 className="font-display text-base font-semibold text-ink">Today&apos;s classes</h2>
              <span className="ml-auto rounded-full bg-gold-pale px-2 py-0.5 text-[11px] font-bold text-gold-deep"><CountUp to={todays.length} duration={800} /></span>
            </div>
            <div className="divide-y divide-line/60">
              {todays.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 px-6 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/60"><Icon name="classes" className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{c.subject}</p>
                    <p className="text-xs text-ink/45">{fmtWATTime(c.starts_at)} · {c.platform} · {c.duration_minutes} min</p>
                  </div>
                  {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[34px] !px-4 !text-sm">Join</a>}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Quick actions */}
      <Reveal delay={120}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction href="/tutor/calendar" icon="calendar" label="My calendar" />
          <QuickAction href="/tutor/learners" icon="students" label="My learners" />
          <QuickAction href="/tutor/attendance" icon="checkCircle" label="Attendance" />
          <QuickAction href="/tutor/assignments" icon="assignments" label="Assignments" />
        </div>
      </Reveal>
    </div>
  );
}

const TINTS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10",
  gold: "bg-gold-pale text-gold-deep",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
};

function StatCard({ href, icon, label, value, tint, sub }: { href: string; icon: IconName; label: string; value: number; tint: string; sub?: string }) {
  return (
    <Link href={href} className="card card-interactive flex flex-col gap-2 p-5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${TINTS[tint] ?? TINTS.blue}`}><Icon name={icon} className="h-4 w-4" /></span>
      <p className="font-display text-3xl font-bold text-ink"><CountUp to={value} duration={1000} /></p>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
        {sub && <p className="text-[11px] text-ink/35">{sub}</p>}
      </div>
    </Link>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} className="card card-interactive flex items-center gap-2.5 px-4 py-3.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ink/5 text-ink/60"><Icon name={icon} className="h-4 w-4" /></span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </Link>
  );
}
