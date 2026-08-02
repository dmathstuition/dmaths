import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Icon, type IconName } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import EngagementChart from "@/components/admin/EngagementChart";
import { learnerAvatar } from "@/lib/avatars";
import { spentPoints } from "@/lib/rewards";
import { activityBuckets, isOnStreak, weeklyActivity, pct } from "@/lib/analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Engagement analytics · D-Maths" };

// Admin Engagement analytics — how much learners actually USE the platform,
// complementing the dashboard's outcome charts (enrolment/revenue/scores) and
// the audit-log Activity page. Everything reads with the service role; sources
// that need a migration (practice/mock sessions, redemptions) degrade to empty.
export default async function AnalyticsPage() {
  const admin = supabaseAdmin();
  const weeksAgo = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString();

  const [
    { data: students },
    { data: practice },
    { data: mocks },
    { data: redemptions },
  ] = await Promise.all([
    admin.from("profiles")
      .select("id, first_name, last_name, level, last_login_at, streak_count, streak_last_date, reward_points, is_active")
      .eq("role", "student"),
    admin.from("practice_sessions").select("created_at").gte("created_at", weeksAgo),
    admin.from("mock_exam_sessions").select("created_at").gte("created_at", weeksAgo),
    admin.from("reward_redemptions").select("cost, status"),
  ]);

  const learners = students ?? [];
  const total = learners.length;

  const buckets = activityBuckets(learners.map((s: any) => s.last_login_at));
  const onStreak = learners.filter((s: any) => isOnStreak(s.streak_last_date)).length;
  const weekly = weeklyActivity(
    (practice ?? []).map((r: any) => r.created_at),
    (mocks ?? []).map((r: any) => r.created_at),
    8,
  );

  const streakLeaders = [...learners]
    .filter((s: any) => (s.streak_count ?? 0) > 0)
    .sort((a: any, b: any) => (b.streak_count ?? 0) - (a.streak_count ?? 0))
    .slice(0, 5);

  const totalEarned = learners.reduce((a: number, s: any) => a + Number(s.reward_points || 0), 0);
  const totalSpent = spentPoints((redemptions ?? []) as any[]);
  const pendingRedemptions = (redemptions ?? []).filter((r: any) => r?.status === "pending").length;

  const practiceThisWeek = weekly[weekly.length - 1]?.practice ?? 0;
  const mockThisWeek = weekly[weekly.length - 1]?.mock ?? 0;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="progress" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Engagement analytics</h1>
          <p className="mt-1 text-sm text-white/50">How actively learners are using the platform — {total} student{total === 1 ? "" : "s"}.</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon="zap" tint="gold" label="Active today" value={buckets.today} sub={`${pct(buckets.today, total)}% of learners`} />
        <Kpi icon="students" tint="blue" label="Active this week" value={buckets.week} sub={`${pct(buckets.week, total)}% of learners`} />
        <Kpi icon="calendar" tint="sky" label="Active this month" value={buckets.month} sub={`${pct(buckets.month, total)}% of learners`} />
        <Kpi icon="flame" tint="emerald" label="On a streak" value={onStreak} sub={`${pct(onStreak, total)}% keeping it up`} />
      </div>

      {/* Weekly activity */}
      <Reveal>
        <div className="card neu-card p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold">Learning activity</h2>
            <span className="text-xs font-bold text-ink/45">{practiceThisWeek + mockThisWeek} sessions this week</span>
          </div>
          <p className="mb-3 text-xs text-ink/45">Practice rounds + mock exams per week · last 8 weeks</p>
          <EngagementChart data={weekly} />
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Login recency funnel */}
        <Reveal>
          <div className="card neu-card p-6">
            <h2 className="mb-1 font-display text-base font-semibold">Login recency</h2>
            <p className="mb-4 text-xs text-ink/45">When each learner last opened the portal</p>
            <div className="space-y-3">
              <FunnelBar label="Today" n={buckets.today} total={total} color="#059669" />
              <FunnelBar label="This week" n={buckets.week} total={total} color="#1A60AB" />
              <FunnelBar label="This month" n={buckets.month} total={total} color="#C8881F" />
              <FunnelBar label="Dormant (30d+ / never)" n={buckets.dormant} total={total} color="#EF4444" />
            </div>
          </div>
        </Reveal>

        {/* Streak leaders */}
        <Reveal>
          <div className="card neu-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Streak leaders</h2>
              <Link href="/admin/students" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
            </div>
            {streakLeaders.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink/40">No active streaks yet.</p>
            ) : (
              <div className="space-y-3">
                {streakLeaders.map((s: any, i: number) => (
                  <Link key={s.id} href={`/admin/students/${s.id}`} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${i === 0 ? "bg-gold text-board" : "bg-chalk text-ink/50"}`}>{i + 1}</span>
                    <Avatar name={`${s.first_name} ${s.last_name}`} size="sm" src={learnerAvatar(s.id)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{s.first_name} {s.last_name}</p>
                      <p className="truncate text-xs text-ink/45">{s.level || "—"}</p>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1 font-display text-sm font-bold text-gold-deep">
                      <Icon name="flame" className="h-4 w-4" /> {s.streak_count}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Reward economy */}
      <Reveal>
        <div className="card neu-card p-6">
          <h2 className="mb-1 font-display text-base font-semibold">Reward economy</h2>
          <p className="mb-4 text-xs text-ink/45">Points earned across all learners, and what&apos;s been spent in the shop</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Mini label="Points earned" value={totalEarned} icon="coins" />
            <Mini label="Points spent" value={totalSpent} icon="gift" />
            <Mini label="Redemptions to fulfil" value={pendingRedemptions} icon="target"
              href={pendingRedemptions > 0 ? "/admin/rewards" : undefined} />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

const TINTS: Record<string, string> = {
  blue: "bg-ink/10 text-ink",
  gold: "bg-gold-pale text-gold-deep",
  sky: "bg-sky/20 text-ink",
  emerald: "bg-emerald-50 text-emerald-600",
};

function Kpi({ icon, tint, label, value, sub }: { icon: IconName; tint: string; label: string; value: number; sub: string }) {
  return (
    <div className="card neu-card flex flex-col gap-3 p-5">
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${TINTS[tint]}`}>
        <Icon name={icon} />
      </span>
      <div>
        <p className="font-display text-2xl font-bold text-ink sm:text-3xl"><CountUp to={value} duration={1000} /></p>
        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
        <p className="mt-0.5 text-[11px] text-ink/45">{sub}</p>
      </div>
    </div>
  );
}

function FunnelBar({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const p = pct(n, total);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="font-semibold text-ink/75">{label}</span>
        <span className="font-bold text-ink/50">{n} · {p}%</span>
      </div>
      <div className="neu-inset h-2.5 overflow-hidden rounded-full">
        <div className="bar-animate h-full rounded-full" style={{ width: `${Math.max(2, p)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Mini({ label, value, icon, href }: { label: string; value: number; icon: IconName; href?: string }) {
  const inner = (
    <div className="neu-card rounded-2xl border border-line p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-chalk text-gold-deep"><Icon name={icon} className="h-4 w-4" /></span>
      <p className="mt-2 font-display text-xl font-extrabold text-ink"><CountUp to={value} duration={1000} /></p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
    </div>
  );
  return href ? <Link href={href} className="block transition hover:opacity-80">{inner}</Link> : inner;
}
