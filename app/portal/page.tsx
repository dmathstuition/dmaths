import Link from "next/link";
import JoinClassButton from "@/components/portal/JoinClassButton";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import { Icon, type IconName } from "@/components/Icons";
import RateCard from "@/components/portal/RateCard";
import AddToCalendar from "@/components/portal/AddToCalendar";
import MomentumCard from "@/components/portal/MomentumCard";
import DashboardTip from "@/components/portal/DashboardTip";
import Tour from "@/components/tour/Tour";
import { studentTour } from "@/components/tour/steps";
import { fmtWAT, fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const user = await getUser();
  const supa = supabaseServer();
  const [me, { data: classes }, { data: subs }, { data: notices }, { data: unreadMsgs }] = await Promise.all([
    getProfile(),
    supa.from("classes").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    supa.from("assignment_submissions").select("status").eq("student_id", user!.id),
    supa.from("notices").select("id,title,created_at").order("created_at", { ascending: false }).limit(3),
    supa.from("messages").select("id").eq("sender_role", "admin").eq("read", false),
  ]);

  const pending = (subs ?? []).filter(s => s.status === "pending").length;
  const unread = unreadMsgs?.length ?? 0;

  // In-app reminder: is the next class today or starting within 2 hours?
  const nextClass = classes?.[0];
  const nextMins = nextClass ? (new Date(nextClass.starts_at).getTime() - Date.now()) / 60000 : Infinity;
  const classSoon = nextMins <= 120;
  const classToday = nextClass ? fmtWATDate(nextClass.starts_at) === fmtWATDate(Date.now()) : false;
  const showClassReminder = nextClass && (classSoon || classToday);
  // Monthly-subscription banner: show from 5 days before the due date; red once overdue.
  const subDueRaw = (me as any)?.sub_active ? (me as any)?.sub_due_date : null;
  const subDue = subDueRaw ? new Date(`${subDueRaw}T00:00:00+01:00`) : null;
  const subDaysLeft = subDue ? Math.ceil((subDue.getTime() - Date.now()) / 86_400_000) : null;
  const showSubBanner = subDaysLeft !== null && subDaysLeft <= 5;
  const subOverdue = subDaysLeft !== null && subDaysLeft < 0;
  const subAmount = Number((me as any)?.sub_amount || 0);

  const streak: number = (me as any)?.streak_count ?? 0;
  const rewardPts: number = (me as any)?.reward_points ?? 0;
  const sanctionPts: number = (me as any)?.sanction_points ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <Reveal>
        <div data-tour="hero" className="boardgrid text-crisp relative overflow-hidden rounded-2xl p-7 text-white sm:p-9"
          style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
          <div className="aurora pointer-events-none absolute inset-0 opacity-25" />
          {/* contrast guard: keeps the text side dark no matter what effects render */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(100deg, rgba(7,25,48,.82) 0%, rgba(7,25,48,.35) 55%, rgba(7,25,48,0) 100%)" }} />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-15"
            style={{ background: "radial-gradient(circle at 80% 20%, #EFAE56, transparent 60%)" }} />
          <div className="pointer-events-none absolute -right-10 top-1/2 h-1 w-64 -rotate-45 bg-gold/40" />
          <div className="pointer-events-none absolute right-8 top-5 h-16 w-16 rounded-full border border-white/10 float" />
          <div className="pointer-events-none absolute right-20 bottom-5 h-9 w-9 rounded-full border border-gold/25 float"
            style={{ animationDelay: "1.6s" }} />
          {/* Animated mascot + floating maths — decorative, kept to the right so
              they never sit behind the text (disabled under reduced-motion). */}
          <div aria-hidden className="pointer-events-none absolute right-5 top-6 select-none text-4xl float drop-shadow">🤖</div>
          <div aria-hidden className="pointer-events-none absolute right-24 top-14 select-none font-display text-2xl font-bold text-gold/70 float" style={{ animationDelay: "0.8s" }}>π</div>
          <div aria-hidden className="pointer-events-none absolute right-14 bottom-8 select-none font-display text-xl font-bold text-white/40 float" style={{ animationDelay: "1.9s" }}>√</div>
          <div aria-hidden className="pointer-events-none absolute right-36 bottom-16 select-none font-display text-lg font-bold text-gold/50 float" style={{ animationDelay: "2.6s" }}>∑</div>
          <div className="relative">
            <p className="pill-gold mb-3">🎓 {me?.level || "Student"}</p>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              Welcome back, <span className="text-gold">{me?.first_name}</span>!
            </h1>
            <p className="mt-2 text-sm text-white/70">
              ID: <span className="font-mono font-semibold text-white">{me?.student_code}</span>
            </p>
            {streak > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold ring-1 ring-gold/30">
                🔥 {streak}-day learning streak
              </p>
            )}
            <div className="mt-5">
              <Link href="/portal/refer" data-tour="refer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20 hover:scale-[1.03]">
                🎁 Refer a friend
              </Link>
            </div>
            <DashboardTip />
          </div>
        </div>
      </Reveal>

      {/* Reminder: a class today / starting soon */}
      {showClassReminder && (
        <Reveal>
          <Link href="/portal/classes"
            className="group flex flex-wrap items-center gap-4 rounded-2xl border border-gold/40 bg-gold-pale px-5 py-4 transition hover:shadow-lift">
            <span className="relative flex">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-25" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-lg">⏰</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{classSoon ? "Class starting soon" : "You have a class today"}</p>
              <p className="truncate text-sm text-ink/60">{nextClass!.subject} · {fmtWAT(nextClass!.starts_at)}</p>
            </div>
            <span className="btn-gold !min-h-[38px] transition group-hover:translate-x-0.5">View →</span>
          </Link>
        </Reveal>
      )}

      {/* Monthly tuition due / overdue */}
      {showSubBanner && subDue && (
        <Reveal>
          <div className={`flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4 ${
            subOverdue ? "border-red-200 bg-red-50" : "border-gold/40 bg-gold-pale"}`}>
            <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
              subOverdue ? "bg-red-500 text-white" : "bg-gold"}`}>{subOverdue ? "⚠️" : "💛"}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${subOverdue ? "text-red-800" : "text-ink"}`}>
                {subOverdue ? "Monthly tuition overdue" : "Monthly tuition due soon"}
              </p>
              <p className={`text-sm ${subOverdue ? "text-red-700/80" : "text-ink/60"}`}>
                {subAmount > 0 ? `₦${subAmount.toLocaleString("en-NG")} · ` : ""}
                {subOverdue ? "was due" : "due"} {fmtWATDate(subDue)} — pay via transfer
                (Opay 7025674894 / Access 1534530227) or message us from the portal.
              </p>
            </div>
          </div>
        </Reveal>
      )}

      {/* Level & momentum — gamified progress centrepiece */}
      <Reveal delay={40}>
        <MomentumCard rewardPoints={rewardPts} streak={streak} avgScore={me?.avg_score ?? 0} />
      </Reveal>

      {/* Stat grid */}
      <div data-tour="stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Reveal delay={0}>
          <Stat icon="classes" label="Upcoming classes" value={classes?.length ?? 0} accent="sky" />
        </Reveal>
        <Reveal delay={60}>
          <Stat icon="assignments" label="Pending tasks" value={pending} accent="gold" highlight={pending > 0} />
        </Reveal>
        <Reveal delay={120}>
          <Stat icon="progress" label="Average score" value={me?.avg_score ?? 0} suffix="%" accent="emerald" bar />
        </Reveal>
        <Reveal delay={180}>
          <Stat icon="calendar" label="Attendance" value={me?.attendance ?? 0} suffix="%" accent="blue" bar />
        </Reveal>
        <Reveal delay={240}>
          <Stat icon="trophy" label="Reward pts" value={rewardPts} accent="green" prefix={rewardPts > 0 ? "+" : ""} green={rewardPts > 0} />
        </Reveal>
        <Reveal delay={300}>
          <Stat icon="checkCircle" label="Sanctions" value={Math.abs(sanctionPts)} prefix={sanctionPts < 0 ? "−" : ""} accent="red" red={sanctionPts < 0} />
        </Reveal>
        <Reveal delay={360}>
          <Link href="/portal/messages" className="block">
            <Stat icon="messages" label="Messages" value={unread} accent="gold" highlight={unread > 0} />
          </Link>
        </Reveal>
      </div>

      {/* Content cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={80}>
          <div data-tour="classes" className="card neu-card h-full p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Next classes</h2>
            {(classes ?? []).map(c => (
              <div key={c.id}
                className="mb-1 -mx-2 flex items-center justify-between rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                <div>
                  <p className="text-sm font-extrabold">{c.subject}</p>
                  <p className="text-xs text-ink/45">
                    {fmtWAT(c.starts_at)} · {c.tutor}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AddToCalendar event={{ subject: c.subject, starts_at: c.starts_at, duration_minutes: c.duration_minutes, platform: c.platform, link: c.link, location: (c as any).location }} />
                  {c.link && <JoinClassButton classId={c.id} link={c.link} label="Join" className="btn-gold !min-h-[34px] !px-3 !text-xs" />}
                </div>
              </div>
            ))}
            {!classes?.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="calendar" className="h-8 w-8" />
                <p className="text-sm">No upcoming classes scheduled yet.</p>
              </div>
            )}
            <Link href="/portal/classes" className="mt-3 inline-block text-sm font-bold text-gold-deep hover:underline">
              View all classes →
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="card neu-card h-full p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Latest notices</h2>
            {(notices ?? []).map(n => (
              <div key={n.id}
                className="-mx-2 mb-1 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                <p className="text-sm font-bold">{n.title}</p>
                <p className="text-xs text-ink/40">
                  {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </p>
              </div>
            ))}
            {!notices?.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="notices" className="h-8 w-8" />
                <p className="text-sm">No notices yet.</p>
              </div>
            )}
            <Link href="/portal/notices" className="mt-3 inline-block text-sm font-bold text-gold-deep hover:underline">
              View all notices →
            </Link>
          </div>
        </Reveal>
      </div>

      <Reveal delay={160}><div data-tour="rate"><RateCard /></div></Reveal>

      <Tour tourId="student" steps={studentTour} />
    </div>
  );
}

const ACCENTS: Record<string, { icon: string; bar: string }> = {
  sky:     { icon: "bg-sky/20 text-ink",             bar: "#7BA3CA" },
  gold:    { icon: "bg-gold-pale text-gold-deep",     bar: "#C8881F" },
  emerald: { icon: "bg-emerald-50 text-emerald-600",  bar: "#059669" },
  blue:    { icon: "bg-ink/10 text-ink",              bar: "#1A60AB" },
  green:   { icon: "bg-emerald-50 text-emerald-600",  bar: "#059669" },
  red:     { icon: "bg-red-50 text-red-500",          bar: "#EF4444" },
};

function Stat({ label, value, icon, accent = "blue", suffix = "", prefix = "", bar, highlight, green, red }: {
  label: string; value: number; icon: IconName; accent?: string;
  suffix?: string; prefix?: string; bar?: boolean;
  highlight?: boolean; green?: boolean; red?: boolean;
}) {
  const a = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <div className={`card neu-card card-interactive stat-shimmer relative flex flex-col gap-2 overflow-hidden p-5 ${highlight ? "ring-2 ring-gold/40" : ""}`}>
      <span className={`ci-icon flex h-9 w-9 items-center justify-center rounded-xl ${a.icon}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <p className={`font-display text-3xl font-semibold leading-none ${green ? "text-emerald-600" : red ? "text-red-500" : ""}`}>
        {prefix}<CountUp to={value} suffix={suffix} duration={1200} />
      </p>
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">{label}</p>
      {bar && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="bar-animate h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: a.bar }} />
        </div>
      )}
    </div>
  );
}
