import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/Icons";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import Tour from "@/components/tour/Tour";
import { adminTour } from "@/components/tour/steps";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supa = supabaseServer();
  const now = new Date().toISOString();
  const [
    { count: students }, { count: pending }, { count: classes },
    { count: activeStudents }, { data: recent }, { data: allStudents }, { count: assignments },
    { data: payments },
  ] = await Promise.all([
    supa.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    supa.from("applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("classes").select("*", { count: "exact", head: true }).gte("starts_at", now),
    supa.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
    supa.from("profiles").select("id,student_code,first_name,last_name,level,avg_score,attendance,is_active")
      .eq("role", "student").order("created_at", { ascending: false }).limit(6),
    supa.from("profiles").select("avg_score,attendance").eq("role", "student"),
    supa.from("assignments").select("*", { count: "exact", head: true }),
    supa.from("payments").select("amount,status,paid_at,created_at").eq("status", "success"),
  ]);

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
  const today = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Reveal>
        <div data-tour="hero" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-board to-boardDeep p-7 text-white sm:p-9">
          <div className="aurora pointer-events-none absolute inset-0 opacity-40" />
          <div aria-hidden className="pointer-events-none absolute right-6 top-6 select-none text-4xl float drop-shadow">🤖</div>
          <div aria-hidden className="pointer-events-none absolute right-24 bottom-8 select-none font-display text-xl font-bold text-gold/50 float" style={{ animationDelay: "1.4s" }}>∑</div>
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-20"
            style={{ background: "radial-gradient(circle at 80% 20%, #EFAE56, transparent 60%)" }} />
          <div className="absolute -right-10 top-1/2 h-1 w-64 -rotate-45 bg-gold/60" />
          <div className="pointer-events-none absolute right-10 top-6 h-20 w-20 rounded-full border border-white/8 float" />
          <div className="pointer-events-none absolute right-28 bottom-4 h-10 w-10 rounded-full border border-gold/20 float" style={{ animationDelay: "2s" }} />
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[.2em] text-white/40">{today}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Welcome back</h1>
            <p className="mt-1 text-sm text-white/55">Here&apos;s what&apos;s happening at D-Maths today.</p>

            <div className="mt-6 flex flex-wrap gap-4">
              <HeroStat label="Active students" value={activeStudents ?? 0} />
              <HeroStat label="Avg score" value={avgScore} suffix="%" />
              <HeroStat label="Avg attendance" value={avgAttend} suffix="%" />
              <HeroStat label="Received this month" value={monthRevenue} prefix="₦" />
            </div>
          </div>
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
          <StatCard icon="students" label="Total students" value={students ?? 0} href="/admin/students" tint="blue" />
        </Reveal>
        <Reveal delay={60}>
          <StatCard icon="applications" label="Pending" value={pending ?? 0} href="/admin/applications" tint="gold" />
        </Reveal>
        <Reveal delay={120}>
          <StatCard icon="classes" label="Upcoming classes" value={classes ?? 0} href="/admin/classes" tint="sky" />
        </Reveal>
        <Reveal delay={180}>
          <StatCard icon="assignments" label="Assignments" value={assignments ?? 0} href="/admin/assignments" tint="blue" />
        </Reveal>
      </div>

      {/* Quick actions */}
      <div data-tour="quick" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction icon="applications" label="Review applications" href="/admin/applications" />
        <QuickAction icon="classes" label="Schedule a class" href="/admin/classes" />
        <QuickAction icon="assignments" label="Post assignment" href="/admin/assignments" />
        <QuickAction icon="notices" label="Make announcement" href="/admin/notices" />
      </div>

      {/* Recent students */}
      <Reveal>
        <div className="card overflow-hidden">
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
                      <Link href={`/admin/students/${s.id}`} className="font-bold hover:text-gold-deep hover:underline">
                        {s.first_name} {s.last_name}
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

      <Tour tourId="admin" steps={adminTour} />
    </div>
  );
}

function HeroStat({ label, value, suffix = "", prefix = "" }: { label: string; value: number; suffix?: string; prefix?: string }) {
  return (
    <div className="glass-hero-chip px-5 py-3">
      <p className="font-display text-3xl font-semibold">
        {prefix}<CountUp to={value} suffix={suffix} duration={1400} />
      </p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</p>
    </div>
  );
}

const TINTS: Record<string, string> = {
  blue: "bg-ink/10 text-ink",
  gold: "bg-gold-pale text-gold-deep",
  sky:  "bg-sky/20 text-ink",
};

function StatCard({ icon, label, value, href, tint }: { icon: any; label: string; value: number; href: string; tint: string }) {
  return (
    <Link href={href} className="card card-interactive stat-shimmer group relative flex items-center gap-4 overflow-hidden p-5">
      <span className={`ci-icon flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${TINTS[tint]}`}>
        <Icon name={icon} />
      </span>
      <div>
        <p className="font-display text-2xl font-semibold text-ink">
          <CountUp to={value} duration={1200} />
        </p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
      </div>
    </Link>
  );
}

function QuickAction({ icon, label, href }: { icon: any; label: string; href: string }) {
  return (
    <Link href={href}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-sm font-semibold text-ink/70 transition hover:border-gold/40 hover:bg-gold-pale hover:text-ink hover:shadow-card">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-chalk text-gold-deep transition group-hover:bg-gold group-hover:text-board group-hover:scale-110">
        <Icon name={icon} />
      </span>
      {label}
    </Link>
  );
}
