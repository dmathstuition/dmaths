"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import Tilt3D from "@/components/landing/Tilt3D";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";
import Mascot from "@/components/Mascot";
import { HeroStudy } from "@/components/illustrations";

type Item = { id: string; title: string; description: string | null; cost: number };
type Redemption = { id: string; title: string; cost: number; status: string; created_at: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-gold-pale text-gold-deep" },
  fulfilled: { label: "Fulfilled", cls: "bg-emerald-50 text-emerald-600" },
  rejected:  { label: "Declined",  cls: "bg-red-50 text-red-500" },
};

// Loot-style rarity tiers by point cost — the "high-end game" flavour.
type Tier = { name: string; chip: string; grad: string; glow: string; ring: string; icon: IconName; glowColor: string; hot: boolean; legendary: boolean };
function tier(cost: number): Tier {
  if (cost >= 500) return { name: "Legendary", chip: "bg-gold text-board", grad: "from-[#F4C078] via-[#EFAE56] to-[#C8881F]", glow: "shadow-[0_0_46px_-10px_rgba(239,174,86,.85)]", ring: "ring-gold/50", icon: "crown", glowColor: "rgba(239,174,86,.8)", hot: true, legendary: true };
  if (cost >= 300) return { name: "Epic", chip: "bg-[#8B5CF6] text-white", grad: "from-[#A78BFA] via-[#8B5CF6] to-[#5B3FB0]", glow: "shadow-[0_0_42px_-12px_rgba(139,92,246,.8)]", ring: "ring-[#8B5CF6]/40", icon: "gem", glowColor: "rgba(139,92,246,.75)", hot: true, legendary: false };
  if (cost >= 100) return { name: "Rare", chip: "bg-[#3B82F6] text-white", grad: "from-[#60A5FA] via-[#3B82F6] to-[#1D4ED8]", glow: "shadow-[0_0_38px_-14px_rgba(59,130,246,.75)]", ring: "ring-[#3B82F6]/40", icon: "medal", glowColor: "rgba(59,130,246,.7)", hot: false, legendary: false };
  return { name: "Common", chip: "bg-[#10B981] text-white", grad: "from-[#34D399] via-[#10B981] to-[#047857]", glow: "", ring: "ring-emerald-400/30", icon: "star", glowColor: "rgba(16,185,129,.6)", hot: false, legendary: false };
}

export default function ShopClient({
  earned, balance, items, initialRedemptions, mascot,
}: {
  earned: number;
  balance: number;
  items: Item[];
  initialRedemptions: Redemption[];
  mascot?: string;
}) {
  const [bal, setBal] = useState(balance);
  const [redemptions, setRedemptions] = useState<Redemption[]>(initialRedemptions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [popId, setPopId] = useState<string | null>(null);

  // Progress toward the cheapest reward the learner can't yet afford.
  const nextLocked = [...items].filter((i) => i.cost > bal).sort((a, b) => a.cost - b.cost)[0];

  async function redeem(item: Item) {
    setBusyId(item.id); setErr("");
    const res = await fetch("/api/rewards/redeem", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) { setErr(json.error || "Couldn't redeem — please try again."); return; }
    setBal(json.spendable);
    setRedemptions((prev) => [json.redemption, ...prev]);
    setCelebrate((c) => c + 1);
    setFlash(item.title);
    setPopId(item.id);
    setTimeout(() => setPopId(null), 650);
    setTimeout(() => setFlash(null), 2200);
  }

  return (
    <div className="space-y-6">
      {/* confetti burst on redeem (fixed overlay so it rains over the page) */}
      <div className="pointer-events-none fixed inset-0 z-[60]">
        <Confetti fire={celebrate > 0} key={celebrate} pieces={44} />
      </div>
      {/* redeem flash */}
      {flash && (
        <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center">
          <div className="badge-pulse rounded-3xl bg-board/90 px-8 py-6 text-center text-white shadow-2xl ring-1 ring-gold/40">
            <p className="flex justify-center text-gold"><Icon name="partyPopper" className="h-8 w-8" /></p>
            <p className="mt-1 font-display text-lg font-bold">Redeemed!</p>
            <p className="text-sm text-white/70">{flash}</p>
          </div>
        </div>
      )}

      {/* ── Balance HUD ─────────────────────────────────────────── */}
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl p-7 text-white sm:p-9"
          style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
          <div className="aurora pointer-events-none absolute inset-0 opacity-25" />
          <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="coins" className="h-7 w-7" /></div>
          <div aria-hidden className="pointer-events-none absolute right-24 bottom-8 text-gold/25 float" style={{ animationDelay: "1.3s" }}><Icon name="coins" className="h-5 w-5" /></div>
          <div aria-hidden className="pointer-events-none absolute left-1/3 top-8 text-gold/20 float" style={{ animationDelay: ".7s" }}><Icon name="sparkles" className="h-4 w-4" /></div>

          <div className="relative flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
                <Icon name="trophy" className="h-3.5 w-3.5 text-gold" /> Rewards shop
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-gold"><Icon name="coins" className="h-8 w-8" /></span>
                <span className="text-gradient-gold font-display text-5xl font-extrabold leading-none sm:text-6xl">
                  <CountUp to={bal} duration={1200} key={bal} />
                </span>
              </p>
              <p className="mt-2 text-sm text-white/55">
                points to spend <span className="text-white/30">· {earned} earned all-time</span>
              </p>

              {/* progress to next reward */}
              {nextLocked && (
                <div className="mt-4 max-w-xs">
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-white/60">
                    <span>Next: {nextLocked.title}</span>
                    <span>{bal}/{nextLocked.cost}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="bar-animate h-full rounded-full bg-gradient-to-r from-gold to-gold-deep"
                      style={{ width: `${Math.min(100, Math.round((bal / nextLocked.cost) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* mascot companion */}
            <div aria-hidden className="pointer-events-none relative hidden h-32 w-28 flex-shrink-0 sm:block">
              <span className="absolute inset-x-0 bottom-2 top-2 rounded-full bg-[radial-gradient(circle,rgba(239,174,86,.28),transparent_62%)] blur-xl" />
              {mascot
                ? <Mascot src={mascot} className="float relative h-full w-full object-contain object-bottom drop-shadow-2xl" fallback={<HeroStudy className="h-full w-full object-contain object-bottom" />} />
                : <HeroStudy className="float relative h-full w-full object-contain object-bottom" />}
            </div>
          </div>
        </div>
      </Reveal>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* ── Loot grid ───────────────────────────────────────────── */}
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const t = tier(item.cost);
            const afford = bal >= item.cost;
            return (
              <Reveal key={item.id} delay={i * 50}>
                <Tilt3D max={8} className="h-full">
                  <div style={{ ["--loot-glow" as any]: t.glowColor }}
                    className={`sheen group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 transition-all duration-300 dark:bg-[#0f2942] ${t.ring} ${t.hot ? "loot-pulse" : ""} ${popId === item.id ? "scale-[1.04] ring-2 ring-gold" : ""} ${afford ? `hover:-translate-y-1 ${t.glow}` : "opacity-90"}`}>
                    {/* rarity banner (rarest cards get an auto shine sweep) */}
                    <div className={`relative flex items-center justify-between bg-gradient-to-r ${t.grad} px-4 py-2.5 text-white ${t.legendary ? "loot-shine" : ""}`}>
                      <span className="relative z-[4] inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide drop-shadow"><Icon name={t.icon} className="h-3.5 w-3.5" /> {t.name}</span>
                      <span className="relative z-[4] inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-bold"><Icon name="coins" className="h-3 w-3" /> {item.cost}</span>
                      {t.hot && <span aria-hidden className="pointer-events-none absolute right-16 top-1 text-white/60 float"><Icon name="sparkles" className="h-3.5 w-3.5" /></span>}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="font-display text-base font-bold text-ink dark:text-white">{item.title}</p>
                      {item.description && <p className="mt-1 flex-1 text-sm text-ink/55 dark:text-white/55">{item.description}</p>}

                      {afford ? (
                        <button onClick={() => redeem(item)} disabled={busyId === item.id}
                          className="btn-gold mt-4 w-full !rounded-xl transition group-hover:brightness-105 disabled:opacity-60">
                          {busyId === item.id ? "Redeeming…" : <span className="inline-flex items-center gap-1.5">Redeem <Icon name="coins" className="h-4 w-4" /></span>}
                        </button>
                      ) : (
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-ink/45 dark:text-white/40">
                            <span className="inline-flex items-center gap-1"><Icon name="lock" className="h-3 w-3" /> Locked</span>
                            <span>{item.cost - bal} more</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-line dark:bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep"
                              style={{ width: `${Math.min(100, Math.round((bal / item.cost) * 100))}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Tilt3D>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink/40">
          <Icon name="sparkles" className="h-10 w-10 text-ink/30" />
          <p className="text-sm">No rewards in the shop yet — check back soon!</p>
        </div>
      )}

      {/* ── My redemptions ──────────────────────────────────────── */}
      {redemptions.length > 0 && (
        <Reveal delay={80}>
          <div className="card neu-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">My redemptions</h2>
            <div className="divide-y divide-line/60">
              {redemptions.map((r) => {
                const s = STATUS[r.status] ?? STATUS.pending;
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep"><Icon name="coins" className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{r.title}</p>
                      <p className="text-xs text-ink/40">
                        {r.cost} pts · {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-ink/45">
              Pending &amp; fulfilled redemptions hold your points; a declined one returns them.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
