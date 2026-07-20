import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import Tilt3D from "@/components/landing/Tilt3D";
import PortalPhone from "@/components/landing/PortalPhone";
import { Icon, type IconName } from "@/components/Icons";

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: "classes", label: "Join live classes from your phone" },
  { icon: "progress", label: "Grades, attendance & streaks, tracked live" },
  { icon: "bell", label: "Assignments & instant class reminders" },
  { icon: "download", label: "Installs like a real app — even works offline" },
];

// "The portal in your pocket" — a premium app-showcase band with a crisp
// phone mock of the learner dashboard. Shared by the landing & summer-camp
// pages; `variant` tunes the copy + call to action.
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
              <Icon name="monitor" className="h-3.5 w-3.5" /> The portal in your pocket
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
              {camp ? (
                <>Track every camp <span className="text-gradient-gold">win</span>, live</>
              ) : (
                <>Your progress, <span className="text-gradient-gold">in your pocket</span></>
              )}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              {camp
                ? "Every camper gets the same personal portal our students use — join sessions, see grades and attendance, and keep the streak going, all from one beautiful app."
                : "A personal learning app that goes wherever you do. Live classes, grades, streaks and reminders — designed to feel effortless and premium."}
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

          {/* phone */}
          <div className="relative flex justify-center [perspective:1200px]">
            {/* floating stat badges for depth */}
            <div className="float pointer-events-none absolute left-2 top-8 z-10 hidden rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur sm:block">
              <p className="font-display text-lg font-bold leading-none text-gold">92%</p>
              <p className="text-[9px] font-semibold text-white/60">avg score</p>
            </div>
            <div className="float pointer-events-none absolute bottom-10 right-2 z-10 hidden rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white backdrop-blur sm:block"
              style={{ animationDelay: "1.4s" }}>
              <p className="font-display text-lg font-bold leading-none text-gold">12🔥</p>
              <p className="text-[9px] font-semibold text-white/60">day streak</p>
            </div>
            <Tilt3D max={8}>
              <PortalPhone />
            </Tilt3D>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
