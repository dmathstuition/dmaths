"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import type { RiskLevel } from "@/lib/atRisk";

const LEVELS: { key: RiskLevel | "all"; label: string }[] = [
  { key: "all", label: "All" }, { key: "high", label: "High" }, { key: "medium", label: "Medium" }, { key: "low", label: "Low" },
];
const BADGE: Record<RiskLevel, string> = {
  high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-sky-100 text-sky-800", none: "",
};

export default function AtRiskClient({ flagged, totalActive }: { flagged: any[]; totalActive: number }) {
  const [filter, setFilter] = useState<RiskLevel | "all">("all");
  const rows = useMemo(() => (filter === "all" ? flagged : flagged.filter((r) => r.level === filter)), [filter, flagged]);
  const counts = {
    high: flagged.filter((r) => r.level === "high").length,
    medium: flagged.filter((r) => r.level === "medium").length,
    low: flagged.filter((r) => r.level === "low").length,
  };

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="alertTriangle" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Students to watch</h1>
          <p className="mt-1 text-sm text-white/50">
            {flagged.length} of {totalActive} active learners may need attention — falling scores, attendance or overdue work.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="High priority" value={counts.high} tint="text-red-600" />
        <Tile label="Medium" value={counts.medium} tint="text-amber-600" />
        <Tile label="Low" value={counts.low} tint="text-sky-700" />
      </div>

      <div className="card neu-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Flagged learners ({rows.length})</h2>
          <div className="flex gap-1.5">
            {LEVELS.map((l) => (
              <button key={l.key} onClick={() => setFilter(l.key)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === l.key ? "bg-gold text-board" : "bg-chalk text-ink/55 hover:bg-chalk/70"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {rows.length ? (
          <div className="divide-y divide-line/60">
            {rows.map((r) => (
              <Link key={r.id} href={`/admin/students/${r.id}`}
                className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-chalk/50">
                <span className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${BADGE[r.level as RiskLevel]}`}>
                  {r.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{r.name} <span className="font-normal text-ink/40">{r.level && `· ${r.level}`}</span></p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.reasons.map((reason: string, i: number) => (
                      <span key={i} className="rounded-md bg-chalk px-2 py-0.5 text-[11px] font-semibold text-ink/60">{reason}</span>
                    ))}
                  </div>
                </div>
                <span className="flex-shrink-0 self-center text-ink/30"><Icon name="progress" /></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-14 text-ink/40">
            <Icon name="checkCircle" className="h-8 w-8 text-emerald-500" />
            <p className="text-sm">No learners in this band — nice work.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="card neu-card p-5">
      <p className={`font-display text-3xl font-bold ${tint}`}>{value}</p>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
