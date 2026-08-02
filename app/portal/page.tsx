import Link from "next/link";
import JoinClassButton from "@/components/portal/JoinClassButton";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import { Icon, type IconName } from "@/components/Icons";
import HeroMascot from "@/components/HeroMascot";
import { learnerAvatarFor } from "@/lib/avatars";
import { subjectAverages } from "@/lib/progress";
import { HeroStudy } from "@/components/illustrations";
import RateCard from "@/components/portal/RateCard";
import AddToCalendar from "@/components/portal/AddToCalendar";
import MomentumCard from "@/components/portal/MomentumCard";
import DashboardTip from "@/components/portal/DashboardTip";
import DailyRewardChest from "@/components/portal/DailyRewardChest";
import Tour from "@/components/tour/Tour";
import { studentTour } from "@/components/tour/steps";
import { fmtWAT, fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";

// Time-aware greeting in West Africa Time.
function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos", hour: "2-digit", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

// Friendly "due" label + colour tone for an upcoming assignment.
function dueLabel(due: string): { text: string; tone: "red" | "gold" | "muted" } {
  const days = Math.ceil((new Date(`${due}T00:00:00+01:00`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "red" };
  if (days === 0) return { text: "Due today", tone: "red" };
  if (days === 1) return { text: "Due tomorrow", tone: "gold" };
  return { text: `Due in ${days} days`, tone: "muted" };
}
const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-500",
  gold: "bg-gold-pale text-gold-deep",
  muted: "bg-chalk text-ink/45",
};

export default async function StudentDashboard() {
  const user = await getUser();
  const supa = supabaseServer();
  const [me, { data: classes }, { data: subs }, { data: notices }, { data: unreadMsgs }] = await Promise.all([
    getProfile(),
    supa.from("classes").select("*").gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    // Submissions, carrying grade + assignment so we can list what's upcoming
    // and average graded work per subject.
    supa.from("assignment_submissions").select("status, grade, assignment:assignments(id,title,subject,due_date)").eq("student_id", user!.id),
    supa.from("notices").select("id,title,created_at").order("created_at", { ascending: false }).limit(3),
    supa.from("messages").select("id").eq("sender_role", "admin").eq("read", false),
  ]);

  const pending = (subs ?? []).filter(s => s.status === "pending").length;
  const total = (subs ?? []).length;
  const done = total - pending;
  const unread = unreadMsgs?.length ?? 0;

  // Real per-subject averages from graded work (empty until work is graded).
  const subjectAvgs = subjectAverages(subs ?? []);

  // Upcoming assignments — the pending ones, soonest first.
  const upcoming = (subs ?? [])
    .filter((s: any) => s.status === "pending" && s.assignment?.due_date)
    .map((s: any) => s.assignment)
    .sort((a: any, b: any) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 4);

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

  return (
    <div className="space-y-6">
      {/* Hero + progress overview */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Today's focus hero */}
        <Reveal className="min-w-0 lg:col-span-2">
          <div data-tour="hero" className="relative flex min-h-[250px] items-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF2FE] via-[#E2ECFB] to-[#DCE7F6] p-7 dark:from-[#10406F] dark:via-[#0A2A4F] dark:to-[#071C36] sm:min-h-[270px] sm:p-9">
            <div className="relative z-10 max-w-[62%] sm:max-w-md">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/45">
<Icon name="sparkles" className="h-3.5 w-3.5" /> Today&apos;s focus
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
                {greeting()}, {me?.first_name}! <span className="align-middle">👋</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">
                {pending > 0
                  ? `You have ${pending} task${pending === 1 ? "" : "s"} waiting. Complete them and keep your streak alive.`
                  : "You're all caught up. Keep your streak alive and stay ahead."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="pill-gold inline-flex items-center gap-1"><Icon name="graduationCap" className="h-3 w-3" /> {me?.level || "Student"}</span>
                {streak > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-gold-deep ring-1 ring-gold/30 dark:bg-white/10 dark:text-gold">
                    <Icon name="flame" className="h-3.5 w-3.5" /> {streak}-day streak
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-ink/40">ID: {me?.student_code}</span>
              </div>
              <div className="mt-5 hidden flex-wrap items-center gap-3 sm:flex">
                <Link href="/portal/plan"
                  className="group inline-flex items-center gap-2 rounded-full bg-board px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-lift dark:bg-gold dark:text-board">
                  View my tasks
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </Link>
                <Link href="/portal/refer" data-tour="refer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-ink/10 transition hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/15 dark:hover:bg-white/20">
<Icon name="gift" className="h-4 w-4" /> Refer a friend
                </Link>
              </div>
              <div className="hidden sm:block"><DashboardTip /></div>
            </div>
            {/* character illustration — the learner's own mascot, large with halo */}
            <HeroMascot src={learnerAvatarFor(user!.id, (me as any)?.avatar_choice)}
              fallback={<HeroStudy className="h-full w-full object-contain object-bottom" />}
              className="absolute bottom-0 right-0 top-0 w-[50%] sm:right-2 sm:w-[52%]" />
          </div>
        </Reveal>

        {/* My progress overview */}
        <Reveal delay={60} className="lg:col-span-1">
          <div className="card neu-card h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">My progress</h2>
              <Link href="/portal/progress" className="text-sm font-bold text-gold-deep hover:underline">Details →</Link>
            </div>
            <div data-tour="stats" className="grid grid-cols-2 gap-3">
              <Progress icon="progress" label="Average score" value={me?.avg_score ?? 0} suffix="%" accent="emerald" bar={me?.avg_score ?? 0} />
              <Progress icon="assignments" label="Assignments" text={`${done}/${total}`} accent="gold" bar={total ? Math.round((done / total) * 100) : 0} />
              <Progress icon="calendar" label="Attendance" value={me?.attendance ?? 0} suffix="%" accent="blue" bar={me?.attendance ?? 0} />
              <Progress icon="zap" label="Current streak" text={`${streak}`} unit="days" accent="gold" flame />
            </div>

            {/* Per-subject averages from graded work */}
            {subjectAvgs.length > 0 && (
              <div className="mt-4 space-y-2.5 border-t border-line pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">By subject</p>
                {subjectAvgs.slice(0, 4).map((s, i) => (
                  <div key={s.subject} className="flex items-center gap-3">
                    <span className="w-20 flex-shrink-0 truncate text-xs font-semibold text-ink">{s.subject}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                      <div className="bar-animate h-full rounded-full" style={{ width: `${Math.min(s.pct, 100)}%`, backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                    </div>
                    <span className="w-9 flex-shrink-0 text-right text-xs font-bold text-ink">{s.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Daily reward chest — a reason to visit every day */}
      <Reveal delay={30}><DailyRewardChest /></Reveal>

      {/* Reminder: a class today / starting soon */}
      {showClassReminder && (
        <Reveal>
          <Link href="/portal/classes"
            className="group flex flex-wrap items-center gap-4 rounded-2xl border border-gold/40 bg-gold-pale px-5 py-4 transition hover:shadow-lift">
            <span className="relative flex">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-25" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold text-board"><Icon name="clock" className="h-5 w-5" /></span>
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
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${
              subOverdue ? "bg-red-500 text-white" : "bg-gold text-board"}`}><Icon name={subOverdue ? "alertTriangle" : "payments"} className="h-5 w-5" /></span>
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

      {/* Classes · Assignments · Notices */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* My classes */}
        <Reveal delay={80}>
          <div data-tour="classes" className="card neu-card h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">My classes</h2>
              <Link href="/portal/classes" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
            </div>
            {(classes ?? []).map(c => (
              <div key={c.id}
                className="-mx-2 mb-1 flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-ink/10 text-ink">
                  <Icon name="classes" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-ink">{c.subject}</p>
                  <p className="truncate text-xs text-ink/45">{fmtWAT(c.starts_at)} · {c.tutor}</p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <AddToCalendar event={{ subject: c.subject, starts_at: c.starts_at, duration_minutes: c.duration_minutes, platform: c.platform, link: c.link, location: (c as any).location }} />
                  {c.link && <JoinClassButton classId={c.id} link={c.link} label="Join" className="btn-gold !min-h-[34px] !px-3 !text-xs" />}
                </div>
              </div>
            ))}
            {!classes?.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="calendar" className="h-8 w-8" />
                <p className="text-sm">No upcoming classes yet.</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Upcoming assignments */}
        <Reveal delay={120}>
          <div className="card neu-card h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Upcoming assignments</h2>
              <Link href="/portal/assignments" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
            </div>
            {upcoming.map((a: any) => {
              const d = dueLabel(a.due_date);
              const dt = new Date(`${a.due_date}T00:00:00+01:00`);
              return (
                <div key={a.id} className="-mx-2 mb-1 flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                  <span className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-chalk text-ink">
                    <span className="text-[9px] font-bold uppercase leading-none text-ink/50">{dt.toLocaleDateString("en-NG", { month: "short" })}</span>
                    <span className="font-display text-sm font-bold leading-tight">{dt.getDate()}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{a.title}</p>
                    <p className="truncate text-xs text-ink/45">{a.subject}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONE[d.tone]}`}>{d.text}</span>
                </div>
              );
            })}
            {!upcoming.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="checkCircle" className="h-8 w-8" />
                <p className="text-sm">Nothing due — you&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Latest notices */}
        <Reveal delay={160}>
          <div className="card neu-card h-full p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Latest notices</h2>
              <Link href="/portal/notices" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
            </div>
            {(notices ?? []).map(n => (
              <div key={n.id}
                className="-mx-2 mb-1 flex items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                  <Icon name="notices" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{n.title}</p>
                  <p className="text-xs text-ink/40">
                    {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
              </div>
            ))}
            {!notices?.length && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="notices" className="h-8 w-8" />
                <p className="text-sm">No notices yet.</p>
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Momentum + rate */}
      <Reveal delay={40}>
        <MomentumCard rewardPoints={rewardPts} streak={streak} avgScore={me?.avg_score ?? 0} />
      </Reveal>

      {unread > 0 && (
        <Reveal>
          <Link href="/portal/messages"
            className="group flex items-center gap-4 rounded-2xl border border-gold/40 bg-gold-pale px-5 py-4 transition hover:shadow-lift">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold text-board">
              <Icon name="messages" className="h-5 w-5" />
            </span>
            <p className="flex-1 text-sm font-bold text-ink">
              You have {unread} new message{unread === 1 ? "" : "s"} from your tutor
            </p>
            <span className="btn-gold !min-h-[38px] transition group-hover:translate-x-0.5">Open →</span>
          </Link>
        </Reveal>
      )}

      <Reveal delay={160}><div data-tour="rate"><RateCard /></div></Reveal>

      <Tour tourId="student" steps={studentTour} />
    </div>
  );
}

// Distinct bar colours for the per-subject breakdown (cycled).
const SUBJECT_COLORS = ["#1A60AB", "#8B5CF6", "#2563EB", "#059669", "#EFAE56"];

const ACCENTS: Record<string, { icon: string; bar: string }> = {
  emerald: { icon: "bg-emerald-50 text-emerald-600", bar: "#059669" },
  blue:    { icon: "bg-ink/10 text-ink",             bar: "#1A60AB" },
  gold:    { icon: "bg-gold-pale text-gold-deep",    bar: "#C8881F" },
};

function Progress({ icon, label, value, text, unit, suffix = "", accent = "blue", bar, flame }: {
  icon: IconName; label: string; value?: number; text?: string; unit?: string;
  suffix?: string; accent?: string; bar?: number; flame?: boolean;
}) {
  const a = ACCENTS[accent] ?? ACCENTS.blue;
  return (
    <div className="rounded-2xl border border-line bg-white/60 p-3.5 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.icon}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {flame && <span aria-hidden className="text-gold"><Icon name="flame" className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-none text-ink">
        {text != null ? text : <CountUp to={value ?? 0} suffix={suffix} duration={1100} />}
        {unit && <span className="ml-1 text-xs font-bold text-ink/40">{unit}</span>}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
      {bar != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="bar-animate h-full rounded-full" style={{ width: `${Math.min(bar, 100)}%`, backgroundColor: a.bar }} />
        </div>
      )}
    </div>
  );
}
