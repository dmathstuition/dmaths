"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { DIVISIONS, divisionIndex, progressToNext } from "@/lib/leagues";

// Gamified "Level & momentum" panel for the learner dashboard. Turns reward
// points into a tiered level with an animated progress ring and a visual tier
// ladder — a premium, motivating centrepiece that reads at a glance. Tiers come
// from lib/leagues so this always agrees with the Leagues page + league strip.

// The ladder, in the shape this card renders (name + accent colour).
const TIERS = DIVISIONS.map((d) => ({ name: d.name, color: d.accent }));

export default function MomentumCard({
  rewardPoints = 0, streak = 0, avgScore = 0,
}: { rewardPoints?: number; streak?: number; avgScore?: number }) {
  const index = divisionIndex(rewardPoints);
  const prog = progressToNext(rewardPoints);
  const current = { name: prog.current.name, color: prog.current.accent };
  const next = prog.next ? { name: prog.next.name } : null;
  const pct = prog.pct;
  const toNext = prog.remaining;
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
      {/* floating flourishes */}
      <div aria-hidden className="pointer-events-none absolute right-5 top-5 text-gold/30 float"><Icon name="coins" className="h-5 w-5" /></div>
      <div aria-hidden className="pointer-events-none absolute right-1/4 bottom-5 text-gold/25 float" style={{ animationDelay: "1.2s" }}><Icon name="sparkles" className="h-4 w-4" /></div>

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

          <Link href="/portal/leagues"
            className="group mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20">
            <Icon name="students" className="h-4 w-4 text-gold" /> This week&apos;s league
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
