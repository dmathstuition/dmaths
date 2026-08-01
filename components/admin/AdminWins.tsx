"use client";
import { useEffect, useState } from "react";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";
import { Icon } from "@/components/Icons";

// A lively "today's wins" card for the admin dashboard — animated counters and a
// confetti burst when something good happened today, plus a milestone bar to
// chase. Makes the daily grind feel rewarding.
export default function AdminWins({
  newStudentsToday, collectedToday, paymentsToday, totalStudents, nextMilestone,
}: {
  newStudentsToday: number;
  collectedToday: number;
  paymentsToday: number;
  totalStudents: number;
  nextMilestone: number;
}) {
  const win = newStudentsToday > 0 || collectedToday > 0;
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => { if (win) setCelebrate(1); }, [win]);

  const toGo = Math.max(0, nextMilestone - totalStudents);
  const pct = Math.min(100, Math.round((totalStudents / Math.max(1, nextMilestone)) * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-lift sm:p-7"
      style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <Confetti fire={celebrate > 0} key={celebrate} pieces={36} />
      </div>
      <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gold/20 blur-2xl" />

      <div className="relative">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/45">
          <Icon name={win ? "partyPopper" : "dashboard"} className="h-3.5 w-3.5" /> {win ? "Today's wins" : "Today so far"}
        </p>

        <div className="mt-3 flex flex-wrap gap-6">
          <Metric label="New sign-ups" value={newStudentsToday} />
          <Metric label="Collected today" value={collectedToday} prefix="₦" thousands />
          <Metric label="Payments" value={paymentsToday} />
        </div>

        <p className="mt-4 text-sm text-white/70">
          {win
            ? "Great momentum — keep it going! 🚀"
            : "A calm day so far. Every class you run compounds. 💪"}
        </p>

        {/* Milestone chase */}
        <div className="mt-5 max-w-md">
          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-white/60">
            <span>{totalStudents} students · next milestone {nextMilestone}</span>
            <span>{toGo === 0 ? "reached! 🏆" : `${toGo} to go`}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="bar-animate h-full rounded-full bg-gradient-to-r from-gold to-gold-deep" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, prefix = "", thousands = false }: { label: string; value: number; prefix?: string; thousands?: boolean }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold leading-none text-gold">
        {prefix}<CountUp to={value} duration={1200} thousands={thousands} />
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/45">{label}</p>
    </div>
  );
}
