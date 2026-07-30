import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { Icon, type IconName } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import AskBuddyButton from "@/components/AskBuddyButton";
import { HeroStudy } from "@/components/illustrations";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import Tour from "@/components/tour/Tour";
import { adminTour } from "@/components/tour/steps";
import AdminCharts from "@/components/admin/AdminCharts";
import AssistantHealthCheck from "@/components/admin/AssistantHealthCheck";
import FinanceOverview from "@/components/admin/FinanceOverview";
import { fmtWAT } from "@/lib/time";

export const dynamic = "force-dynamic";

// Time-aware greeting in West Africa Time, matching the app header.
function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminDashboard() {
  const supa = supabaseServer();
  const now = new Date().toISOString();
  // Include classes that began in the last 3h so an in-progress one can read "Live now".
  const scheduleFrom = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  const [
    me,
    { count: students }, { count: pending }, { count: classes },
    { count: activeStudents }, { data: recent }, { data: allStudents }, { count: assignments },
    { data: payments }, { data: subs }, { data: schedule },
  ] = await Promise.all([
    getProfile(),
    supa.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supa.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("classes").select("*", { count: "exact", head: true }).gte("starts_at", now),
    supa.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
    supa.from("profiles").select("id,student_code,first_name,last_name,level,avg_score,attendance,is_active")
      .eq("role", "student").order("created_at", { ascending: false }).limit(6),
    supa.from("profiles").select("avg_score,attendance,created_at,subjects").eq("role", "student"),
    supa.from("assignments").select("*", { count: "exact", head: true }),
    supa.from("payments").select("amount,status,paid_at,created_at").eq("status", "success"),
    // Active monthly subscriptions (errors harmlessly to null before the migration runs).
    supa.from("profiles").select("sub_amount,sub_due_date").eq("role", "student").eq("sub_active", true),
    // Today's schedule (display only).
    supa.from("classes").select("id,subject,tutor,starts_at,duration_minutes,platform,link")
      .gte("starts_at", scheduleFrom).order("starts_at").limit(5),
  ]);

  const firstName = me?.first_name?.trim() || "there";

  const avgScore = allStudents?.length ? Math.round(allStudents.reduce((a, s) => a + (s.avg_score || 0), 0) / allStudents.length) : 0;
  const avgAttend = allStudents?.length ? Math.round(allStudents.reduce((a, s) => a + (s.attendance || 0), 0) / allStudents.length) : 0;

  // Revenue received this month (from the verified payments ledger; empty until
  // Paystack is live / the migration is run).
  const monthRevenue = (payments ?? [])
    .filter((p: any) => {
      const d = new Date(p.paid_at || p.created_at);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    })
    .reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
  const today = new Date().toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Finance overview figures.
  const totalCollected = (payments ?? []).reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
  const mrr = (subs ?? []).reduce((a: number, s: any) => a + Number(s.sub_amount || 0), 0);
  const activeSubs = subs?.length ?? 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdue = (subs ?? []).filter((s: any) => s.sub_due_date && s.sub_due_date < todayStr);
  const overdueAmount = overdue.reduce((a: number, s: any) => a + Number(s.sub_amount || 0), 0);

  // Top performers — the strongest of the most recent intake (has names + score).
  const topPerformers = [...(recent ?? [])].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0)).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              {greeting()}, {firstName}! <span className="align-middle">👋</span>
            </h1>
            <p className="mt-1 text-sm text-ink/50">Here&apos;s what&apos;s happening at D-Maths today.</p>
          </div>
          <p className="hidden font-mono text-[11px] uppercase tracking-[.2em] text-ink/35 sm:block">{today}</p>
        </div>
      </Reveal>

      {/* Pending banner */}
      {(pending ?? 0) > 0 && (
        <Reveal>
          <Link href="/admin/applications" data-tour="pending"
            className="group flex flex-wrap items-center gap-4 rounded-2xl border border-gold/40 bg-gold-pale px-5 py-4 transition hover:shadow-lift">
            <span className="relative flex">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-25" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-board">
                <Icon name="applications" />
              </span>
            </span>
            <p className="flex-1 text-sm font-bold text-ink">
              {pending} application{pending! > 1 ? "s" : ""} awaiting your review
            </p>
            <span className="btn-gold !min-h-[38px] transition group-hover:translate-x-0.5">Review now →</span>
          </Link>
        </Reveal>
      )}

      {/* Stat cards */}
      <div data-tour="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0}>
          <StatCard icon="students" label="Total students" value={students ?? 0} href="/admin/students" tint="blue" sub={`${activeStudents ?? 0} active`} />
        </Reveal>
        <Reveal delay={60}>
          <StatCard icon="classes" label="Upcoming classes" value={classes ?? 0} href="/admin/classes" tint="sky" sub="scheduled" />
        </Reveal>
        <Reveal delay={120}>
          <StatCard icon="assignments" label="Assignments" value={assignments ?? 0} href="/admin/assignments" tint="gold" sub="posted" />
        </Reveal>
        <Reveal delay={180}>
          <StatCard icon="payments" label="Revenue this month" value={monthRevenue} href="/admin/payments" tint="emerald" prefix="₦" thousands sub="received" />
        </Reveal>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column — the analytical, wide content */}
        <div className="space-y-5 lg:col-span-2">
          {/* Finance overview */}
          <Reveal>
            <FinanceOverview totalCollected={totalCollected} monthRevenue={monthRevenue} mrr={mrr}
              activeSubs={activeSubs} overdueCount={overdue.length} overdueAmount={overdueAmount} />
          </Reveal>

          {/* Performance overview */}
          <Reveal>
            <div data-tour="charts">
              <AdminCharts students={(allStudents ?? []) as any[]} payments={(payments ?? []) as any[]} />
            </div>
          </Reveal>

          {/* Recent students */}
          <Reveal>
            <div className="card neu-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h2 className="font-display text-lg font-semibold text-ink">Recent students</h2>
                <Link href="/admin/students" className="text-sm font-bold text-gold-deep hover:underline">View all →</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
                      <th className="px-5 py-3">Student</th><th className="px-5 py-3">ID</th>
                      <th className="px-5 py-3">Level</th><th className="px-5 py-3">Avg</th>
                      <th className="px-5 py-3">Attend.</th><th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(recent ?? []).map(s => (
                      <tr key={s.id} className="group border-t border-line/60 transition hover:bg-chalk/50">
                        <td className="px-5 py-3">
                          <Link href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                            <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                            <span className="font-bold group-hover:text-gold-deep group-hover:underline">
                              {s.first_name} {s.last_name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-ink/50">{s.student_code}</td>
                        <td className="px-5 py-3 text-ink/60">{s.level}</td>
                        <td className="px-5 py-3">
                          <span className={`font-extrabold ${s.avg_score >= 70 ? "text-emerald-600" : s.avg_score >= 50 ? "text-gold-deep" : "text-red-500"}`}>
                            {s.avg_score}%
                          </span>
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-line">
                            <div className="bar-animate h-full rounded-full"
                              style={{
                                width: `${s.avg_score}%`,
                                backgroundColor: s.avg_score >= 70 ? "#059669" : s.avg_score >= 50 ? "#C8881F" : "#EF4444",
                              }} />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-ink/60">{s.attendance}%</td>
                        <td className="px-5 py-3">
                          <span className={s.is_active ? "pill-green" : "pill-red"}>{s.is_active ? "Active" : "Inactive"}</span>
                        </td>
                      </tr>
                    ))}
                    {!recent?.length && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-ink/40">
                          No students yet — approve an application to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Right column — schedule, standouts, assistant, quick actions */}
        <div className="space-y-5">
          {/* Today's schedule */}
          <Reveal delay={80}>
            <div className="card neu-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Today&apos;s schedule</h2>
                <Link href="/admin/classes" className="text-sm font-bold text-gold-deep hover:underline">View all →</Link>
              </div>
              <div className="space-y-1">
                {(schedule ?? []).map((c: any) => {
                  const start = new Date(c.starts_at).getTime();
                  const end = start + (c.duration_minutes || 60) * 60000;
                  const live = Date.now() >= start && Date.now() <= end;
                  return (
                    <div key={c.id} className="-mx-2 flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink/10 text-ink">
                        <Icon name="classes" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{c.subject}</p>
                        <p className="truncate text-xs text-ink/45">{fmtWAT(c.starts_at)}{c.tutor ? ` · ${c.tutor}` : ""}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${live ? "bg-red-50 text-red-500" : "bg-chalk text-ink/50"}`}>
                        {live ? "● Live now" : "Upcoming"}
                      </span>
                    </div>
                  );
                })}
                {!schedule?.length && (
                  <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                    <Icon name="calendar" className="h-8 w-8" />
                    <p className="text-sm">No classes scheduled.</p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          {/* Top performers */}
          {topPerformers.length > 0 && (
            <Reveal delay={120}>
              <div className="card neu-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-ink">Top performers</h2>
                  <Link href="/admin/students" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
                </div>
                <div className="space-y-3">
                  {topPerformers.map((s, i) => (
                    <Link key={s.id} href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${i === 0 ? "bg-gold text-board" : "bg-chalk text-ink/50"}`}>{i + 1}</span>
                      <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{s.first_name} {s.last_name}</p>
                        <p className="truncate text-xs text-ink/45">{s.level}</p>
                      </div>
                      <span className="flex-shrink-0 font-display text-sm font-bold text-emerald-600">{s.avg_score}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          {/* D-Maths Buddy */}
          <Reveal delay={160}>
            <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lift"
              style={{ background: "linear-gradient(135deg, #4F46E5 0%, #312E81 100%)" }}>
              <div aria-hidden className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 opacity-90">
                <HeroStudy className="h-full w-full" />
              </div>
              <div className="relative max-w-[70%]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">Meet your AI assistant</p>
                <h3 className="mt-1 font-display text-xl font-bold">D-Maths Buddy 🤖</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  I&apos;m here to help you manage students and classes better.
                </p>
                <div className="mt-4">
                  <AskBuddyButton />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Quick actions */}
          <Reveal delay={200}>
            <div data-tour="quick" className="card neu-card p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">Quick actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction icon="students" label="Add student" href="/admin/students" />
                <QuickAction icon="classes" label="Create class" href="/admin/classes" />
                <QuickAction icon="assignments" label="Post assignment" href="/admin/assignments" />
                <QuickAction icon="notices" label="Send message" href="/admin/notices" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <AssistantHealthCheck />

      <Tour tourId="admin" steps={adminTour} />
    </div>
  );
}

const TINTS: Record<string, string> = {
  blue: "bg-ink/10 text-ink",
  gold: "bg-gold-pale text-gold-deep",
  sky:  "bg-sky/20 text-ink",
  emerald: "bg-emerald-50 text-emerald-600",
};

function StatCard({ icon, label, value, href, tint, sub, prefix = "", thousands = false }: {
  icon: IconName; label: string; value: number; href: string; tint: string; sub?: string; prefix?: string; thousands?: boolean;
}) {
  return (
    <Link href={href} className="card neu-card card-interactive stat-shimmer group relative flex flex-col gap-3 overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <span className={`ci-icon flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${TINTS[tint]}`}>
          <Icon name={icon} />
        </span>
        {sub && <span className="rounded-full bg-chalk px-2.5 py-1 text-[10px] font-bold text-ink/45">{sub}</span>}
      </div>
      <div>
        <p className="font-display text-3xl font-bold text-ink">
          {prefix}<CountUp to={value} duration={1200} thousands={thousands} />
        </p>
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
      </div>
    </Link>
  );
}

function QuickAction({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Link href={href}
      className="neu-card group flex flex-col items-center gap-2 rounded-2xl border border-line px-3 py-4 text-center text-xs font-semibold text-ink/70 transition hover:border-gold/40 hover:text-ink">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-chalk text-gold-deep transition group-hover:scale-110 group-hover:bg-gold group-hover:text-board">
        <Icon name={icon} />
      </span>
      {label}
    </Link>
  );
}
