import Link from "next/link";
import { Icon } from "@/components/Icons";
import { divisionFor, progressToNext } from "@/lib/leagues";

// A lovely little "your division" strip — turns the reward-points total into a
// tier the learner climbs, with progress to the next one. Links to Leagues.
export default function LeagueStrip({ points }: { points: number }) {
  const div = divisionFor(points);
  const prog = progressToNext(points);

  return (
    <Link href="/portal/leagues"
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl p-5 text-white shadow-sm transition hover:shadow-lift"
      style={{ background: `linear-gradient(135deg, ${div.accent} 0%, #0A2A4F 92%)` }}>
      <span aria-hidden className="pointer-events-none absolute -right-4 -top-5 text-8xl opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">{div.emoji}</span>

      <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/20">{div.emoji}</span>

      <div className="relative min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">Your division</p>
        <p className="font-display text-lg font-bold leading-tight">{div.name} League</p>
        {prog.next ? (
          <>
            <div className="mt-2 h-2 max-w-xs overflow-hidden rounded-full bg-white/15">
              <div className="bar-animate h-full rounded-full bg-gold" style={{ width: `${prog.pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] font-semibold text-white/70">{prog.remaining} points to {prog.next.emoji} {prog.next.name}</p>
          </>
        ) : (
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-gold"><Icon name="trophy" className="h-4 w-4" /> Top division reached!</p>
        )}
      </div>

      <span className="relative flex-shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5">→</span>
    </Link>
  );
}
