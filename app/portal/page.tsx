import Link from "next/link";
import JoinClassButton from "@/components/portal/JoinClassButton";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";
import CountUp from "@/components/landing/CountUp";
import Reveal from "@/components/landing/Reveal";
import { Icon, type IconName } from "@/components/Icons";

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
  const rewardPts: number = (me as any)?.reward_points ?? 0;
  const sanctionPts: number = (me as any)?.sanction_points ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <Reveal>
        <div className="boardgrid relative overflow-hidden rounded-2xl bg-gradient-to-br from-board to-boardDeep p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20"
            style={{ background: "radial-gradient(circle at 80% 20%, #EFAE56, transparent 60%)" }} />
          <div className="pointer-events-none absolute -right-10 top-1/2 h-1 w-64 -rotate-45 bg-gold/40" />
          <div className="pointer-events-none absolute right-8 top-5 h-16 w-16 rounded-full border border-white/10 float" />
          <div className="pointer-events-none absolute right-20 bottom-5 h-9 w-9 rounded-full border border-gold/25 float"
            style={{ animationDelay: "1.6s" }} />
          <div className="relative">
            <p className="pill-gold mb-3">🎓 {me?.level || "Student"}</p>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              Welcome back, <span className="text-gold">{me?.first_name}</span>!
            </h1>
            <p className="mt-2 text-sm text-white/50">
              ID: <span className="font-mono text-white/80">{me?.student_code}</span>
            </p>
          </div>
        </div>
      </Reveal>

      {/* Stat grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <div className="card h-full p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Next classes</h2>
            {(classes ?? []).map(c => (
              <div key={c.id}
                className="mb-1 -mx-2 flex items-center justify-between rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                <div>
                  <p className="text-sm font-extrabold">{c.subject}</p>
                  <p className="text-xs text-ink/45">
                    {new Date(c.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })} · {c.tutor}
                  </p>
                </div>
                {c.link && <JoinClassButton classId={c.id} link={c.link} label="Join" className="btn-gold !min-h-[34px] !px-3 !text-xs" />}
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
          <div className="card h-full p-6">
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
    <div className={`card stat-shimmer relative flex flex-col gap-2 overflow-hidden p-5 hovlift ${highlight ? "ring-2 ring-gold/40" : ""}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${a.icon}`}>
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
