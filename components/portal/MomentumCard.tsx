"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

// Gamified "Level & momentum" panel for the learner dashboard. Turns reward
// points into a tiered level with an animated progress ring and a visual tier
// ladder — a premium, motivating centrepiece that reads at a glance.

const TIERS = [
  { name: "Bronze", at: 0, color: "#B87333" },
  { name: "Silver", at: 100, color: "#9CA3AF" },
  { name: "Gold", at: 300, color: "#EFAE56" },
  { name: "Platinum", at: 600, color: "#5EA7C7" },
  { name: "Diamond", at: 1000, color: "#8B7BE8" },
];

function tierFor(points: number) {
  let i = 0;
  for (let t = 0; t < TIERS.length; t++) if (points >= TIERS[t].at) i = t;
  const current = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const base = current.at;
  const span = next ? next.at - base : 1;
  const pct = next ? Math.min(100, Math.round(((points - base) / span) * 100)) : 100;
  const toNext = next ? next.at - points : 0;
  return { index: i, current, next, pct, toNext };
}

export default function MomentumCard({
  rewardPoints = 0, streak = 0, avgScore = 0,
}: { rewardPoints?: number; streak?: number; avgScore?: number }) {
  const { index, current, next, pct, toNext } = tierFor(rewardPoints);
  const level = index + 1;

  // animate the ring in from 0 on mount (reduced-motion users just see the end state)
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(pct); return; }
    const t = setTimeout(() => setShown(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  const size = 132, stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (shown / 100) * circ;

  const headline =
    streak >= 7 ? "You're on fire — keep the streak alive!"
    : rewardPoints > 0 ? "Great momentum — you're climbing fast."
    : "Earn reward points in class to level up.";

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lift sm:p-7"
      style={{ background: "linear-gradient(135deg, #123A63 0%, #0A2A4F 55%, #0B1F38 100%)" }}>
      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
        style={{ background: `radial-gradient(circle, ${current.color}55, transparent 70%)` }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
        {/* level ring */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden>
            <defs>
              <linearGradient id="momentum-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F4C078" />
                <stop offset="100%" stopColor={current.color} />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#momentum-grad)" strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,.84,.44,1)" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-[.15em] text-white/45">Level</span>
            <span className="font-display text-4xl font-extrabold leading-none">{level}</span>
            <span className="mt-0.5 text-[11px] font-bold" style={{ color: current.color }}>{current.name}</span>
          </div>
        </div>

        {/* details */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <Icon name="trophy" className="h-4 w-4 text-gold" />
            <p className="font-display text-lg font-bold">{rewardPoints} reward points</p>
          </div>
          <p className="mt-1 text-sm text-white/60">{headline}</p>

          {/* progress to next tier */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-white/55">
              <span>{current.name}</span>
              <span>{next ? `${toNext} pts to ${next.name}` : "Max tier reached"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-[width] duration-1000"
                style={{ width: `${shown}%`, background: "linear-gradient(90deg, #F4C078, #EFAE56, #C8881F)" }} />
            </div>
          </div>

          {/* tier ladder */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            {TIERS.map((t, i) => {
              const reached = i <= index;
              return (
                <span key={t.name}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 transition ${
                    i === index
                      ? "bg-gold text-board ring-gold"
                      : reached
                      ? "bg-white/10 text-white/80 ring-white/15"
                      : "text-white/35 ring-white/10"
                  }`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: reached ? t.color : "rgba(255,255,255,.25)" }} />
                  {t.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
