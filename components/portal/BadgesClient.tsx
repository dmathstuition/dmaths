"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import Tilt3D from "@/components/landing/Tilt3D";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";

interface Badge {
  id: string; slug: string; name: string; description: string;
  icon: string; color: string; points_threshold: number | null;
}
interface EarnedBadge { badge_id: string; earned_at: string; }

// Loot-style rarity by the points needed to unlock — pure presentation flavour.
function rarity(threshold: number | null): { name: string; icon: IconName; chip: string } {
  if (threshold === null) return { name: "Special", icon: "sparkles", chip: "bg-[#8B5CF6] text-white" };
  if (threshold >= 300) return { name: "Legendary", icon: "crown", chip: "bg-gold text-board" };
  if (threshold >= 100) return { name: "Epic", icon: "gem", chip: "bg-[#8B5CF6] text-white" };
  if (threshold >= 50) return { name: "Rare", icon: "medal", chip: "bg-[#3B82F6] text-white" };
  return { name: "Common", icon: "star", chip: "bg-emerald-500 text-white" };
}

type Filter = "all" | "earned" | "locked";

export default function BadgesClient({
  allBadges, earned, rewardPoints,
}: {
  allBadges: Badge[]; earned: EarnedBadge[]; rewardPoints: number;
}) {
  const earnedMap = useMemo(() => new Map(earned.map(e => [e.badge_id, e.earned_at])), [earned]);
  const earnedCount = earned.length;
  const pct = allBadges.length ? Math.round((earnedCount / allBadges.length) * 100) : 0;

  const [filter, setFilter] = useState<Filter>("all");
  const [celebrate, setCelebrate] = useState(0);
  // A celebratory burst when you land on a case that already holds trophies.
  useEffect(() => { if (earnedCount > 0) { const t = setTimeout(() => setCelebrate(1), 200); return () => clearTimeout(t); } }, [earnedCount]);

  const shown = allBadges.filter(b => {
    if (filter === "earned") return earnedMap.has(b.id);
    if (filter === "locked") return !earnedMap.has(b.id);
    return true;
  });

  const tabs: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: allBadges.length },
    { id: "earned", label: "Earned", n: earnedCount },
    { id: "locked", label: "Locked", n: allBadges.length - earnedCount },
  ];

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={46} /></div>

      {/* ── Trophy-case HUD ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white sm:p-8"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="award" className="h-6 w-6" /></div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-8 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name="sparkles" className="h-5 w-5" /></div>

        <div className="relative flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <Icon name="trophy" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Trophy case</h1>
            <p className="mt-1 text-sm text-white/50">
              <span className="font-bold text-gold"><CountUp to={earnedCount} duration={1000} /></span> of {allBadges.length} unlocked · {rewardPoints} reward pts
            </p>
          </div>
        </div>

        {/* collection progress */}
        <div className="relative mt-5 max-w-md">
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-white/55">
            <span>Collection</span><span>{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="bar-animate h-full rounded-full bg-gradient-to-r from-gold to-gold-deep" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* filter tabs */}
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              filter === t.id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/55 hover:bg-chalk"}`}>
            {t.label} <span className="opacity-60">{t.n}</span>
          </button>
        ))}
      </div>

      {/* ── Badge grid ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((badge, i) => {
          const earnedAt = earnedMap.get(badge.id);
          const isEarned = !!earnedAt;
          const r = rarity(badge.points_threshold);
          const ptsLeft = badge.points_threshold !== null ? badge.points_threshold - rewardPoints : null;
          const progress = badge.points_threshold ? Math.min(100, Math.round((rewardPoints / badge.points_threshold) * 100)) : 0;

          return (
            <Reveal key={badge.id} delay={i * 45}>
              <Tilt3D max={7} className="h-full">
                <div className={`sheen group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white p-5 ring-1 transition-all duration-300 dark:bg-[#0f2942] ${
                  isEarned ? "shadow-lift ring-transparent hover:-translate-y-1" : "ring-line grayscale-[35%] hover:grayscale-0 dark:ring-white/10"}`}
                  style={isEarned ? { boxShadow: `0 10px 40px -14px ${badge.color}99` } : undefined}>
                  {/* rarity chip */}
                  <span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${r.chip}`}><Icon name={r.icon} className="h-3 w-3" /> {r.name}</span>

                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:scale-110"
                      style={{ background: isEarned ? `linear-gradient(135deg, ${badge.color}, ${badge.color}bb)` : "#94a3b8" }}>
                      {isEarned && <span aria-hidden className="absolute inset-0 -z-10 rounded-full blur-md" style={{ background: badge.color, opacity: .55 }} />}
                      <Icon name={badge.icon as IconName} className="h-7 w-7" />
                      {isEarned
                        ? <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[13px] font-black text-white ring-2 ring-white dark:ring-[#0f2942]">✓</span>
                        : <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white ring-2 ring-white dark:ring-[#0f2942]"><Icon name="lock" className="h-3 w-3" /></span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-ink dark:text-white">{badge.name}</p>
                      <p className="mt-0.5 text-xs text-ink/55 dark:text-white/55">{badge.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {isEarned ? (
                      <p className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: badge.color }}>
                        <Icon name="partyPopper" className="h-3.5 w-3.5" /> Earned {new Date(earnedAt!).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </p>
                    ) : ptsLeft !== null && ptsLeft > 0 ? (
                      <>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                          <div className="h-full rounded-full transition-all" style={{ background: badge.color, width: `${progress}%` }} />
                        </div>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-ink/45 dark:text-white/45"><Icon name="lock" className="h-3 w-3" /> {ptsLeft} more pts to unlock</p>
                      </>
                    ) : (
                      <p className="inline-flex items-center gap-1 text-xs font-semibold text-ink/40 dark:text-white/40"><Icon name="lock" className="h-3 w-3" /> Special achievement — keep going!</p>
                    )}
                  </div>
                </div>
              </Tilt3D>
            </Reveal>
          );
        })}
        {!shown.length && (
          <div className="card col-span-full flex flex-col items-center gap-2 py-12 text-center text-ink/40">
            <Icon name="award" className="h-12 w-12 text-ink/30" />
            <p className="text-sm">{filter === "earned" ? "No badges earned yet — your first trophy is waiting!" : "Nothing here."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
