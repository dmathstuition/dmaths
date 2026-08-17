import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import Tilt3D from "@/components/landing/Tilt3D";
import { Icon, type IconName } from "@/components/Icons";

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: "classes", label: "Join live classes from anywhere" },
  { icon: "progress", label: "Grades, attendance & streaks, tracked live" },
  { icon: "trophy", label: "Games, rewards & leagues to keep it fun" },
  { icon: "bell", label: "Assignments & instant class reminders" },
];

// A little browser-style window showing the real dashboard's look — colourful
// "Play & learn" tiles and a league strip — so the landing previews the actual
// premium portal rather than a phone mock.
const TILES: { label: string; icon: IconName; from: string; to: string }[] = [
  { label: "Practice",    icon: "target",   from: "#1A60AB", to: "#0A2A4F" },
  { label: "Math Sprint", icon: "zap",      from: "#7C3AED", to: "#4C1D95" },
  { label: "Mathle",      icon: "sigma",    from: "#0E9488", to: "#0B4A44" },
  { label: "Quiz Duel",   icon: "students", from: "#EA580C", to: "#7C2D12" },
  { label: "Boss Battle", icon: "trophy",   from: "#DC2626", to: "#7F1D1D" },
  { label: "Revision",    icon: "book",     from: "#059669", to: "#064E3B" },
];

function DashboardPreview() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line/70 bg-chalk/70 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-ink/40 ring-1 ring-line">portal.dmaths.academy</span>
      </div>

      <div className="space-y-3 p-4">
        {/* greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Good morning</p>
            <p className="font-display text-base font-bold text-ink">Welcome back! 👋</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep">🔥 12-day streak</span>
        </div>

        {/* play & learn tiles */}
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-ink/60"><span className="text-gold-deep">✦</span> Play &amp; learn</p>
          <div className="grid grid-cols-3 gap-2">
            {TILES.map((t) => (
              <div key={t.label} className="flex flex-col justify-between rounded-xl p-2 text-white" style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})` }}>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15"><Icon name={t.icon} className="h-3.5 w-3.5" /></span>
                <span className="mt-2 text-[10px] font-bold leading-tight">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* league strip */}
        <div className="rounded-xl p-3 text-white" style={{ background: "linear-gradient(135deg, #9CA3AF 0%, #0A2A4F 92%)" }}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span>🥈 Silver League</span>
            <span className="text-white/70">79 pts to Gold</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gold" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// A premium app-showcase band that previews the real learner portal. Shared by
// the landing & summer-camp pages; `variant` tunes the copy + call to action.
export default function PortalShowcase({ variant = "landing" }: { variant?: "landing" | "camp" }) {
  const camp = variant === "camp";
  return (
    <section className="mx-auto max-w-7xl px-5 py-16">
      <Reveal className="mesh-dark relative overflow-hidden rounded-[2.5rem] px-6 py-14 shadow-2xl sm:px-12">
        {/* decorative glows */}
        <div aria-hidden className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-ink/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />

        <div className="relative grid items-center gap-10 md:grid-cols-2">
          {/* copy */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-3.5 py-1 text-[11px] font-bold text-gold">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> One beautiful portal
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
              {camp ? (
                <>Track every camp <span className="text-gradient-gold">win</span>, live</>
              ) : (
                <>Learning that feels like <span className="text-gradient-gold">play</span></>
              )}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              {camp
                ? "Every camper gets the same personal portal our students use — join sessions, see grades and attendance, and keep the streak going, all in one place."
                : "Live classes, grades, streaks, games, rewards and leagues — all in one premium portal built to keep every learner motivated and ahead."}
            </p>

            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold ring-1 ring-gold/25">
                    <Icon name={f.icon} className="h-4 w-4" />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href={camp ? "/apply?plan=camp" : "/apply"} className="btn-gold group inline-flex !rounded-full !px-6">
                {camp ? "Reserve a place" : "Get started"}
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <Link href="/login" className="btn !rounded-full border border-white/25 bg-white/5 !px-6 text-white hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </div>

          {/* dashboard preview */}
          <div className="relative flex justify-center [perspective:1200px]">
            <div className="float pointer-events-none absolute left-1 top-6 z-10 hidden rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur sm:block">
              <p className="font-display text-lg font-bold leading-none text-gold">92%</p>
              <p className="text-[9px] font-semibold text-white/60">avg score</p>
            </div>
            <div className="float pointer-events-none absolute -bottom-3 right-1 z-10 hidden rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur sm:block" style={{ animationDelay: "1.4s" }}>
              <p className="font-display text-lg font-bold leading-none text-gold">221</p>
              <p className="text-[9px] font-semibold text-white/60">reward points</p>
            </div>
            <Tilt3D max={7}>
              <DashboardPreview />
            </Tilt3D>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
