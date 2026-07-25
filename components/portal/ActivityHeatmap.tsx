"use client";
import { useMemo, useState } from "react";
import { buildHeatmap, currentStreak, type HeatDay } from "@/lib/heatmap";

// GitHub-style consistency grid. Each cell is a day; the darker it is, the more
// the learner did that day (classes attended, work submitted, focus sessions).
const SHADES = [
  "bg-ink/[0.06] dark:bg-white/[0.06]",
  "bg-gold/30",
  "bg-gold/55",
  "bg-gold/80",
  "bg-gold-deep",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ActivityHeatmap({ dates, weeks = 26 }: { dates: string[]; weeks?: number }) {
  const [hover, setHover] = useState<HeatDay | null>(null);
  const grid = useMemo(() => buildHeatmap(dates, weeks), [dates, weeks]);
  const streak = useMemo(() => currentStreak(dates), [dates]);
  const activeDays = useMemo(() => grid.flat().filter((d) => d.count > 0).length, [grid]);

  // Month label above the first week that starts a new month.
  const labels = grid.map((col, i) => {
    const first = new Date(`${col[0].date}T00:00:00Z`);
    const prev = i > 0 ? new Date(`${grid[i - 1][0].date}T00:00:00Z`) : null;
    return !prev || first.getUTCMonth() !== prev.getUTCMonth() ? MONTHS[first.getUTCMonth()] : "";
  });

  return (
    <div className="card neu-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Study consistency</h2>
          <p className="text-[13px] text-ink/50">
            {activeDays} active day{activeDays === 1 ? "" : "s"} in the last {weeks} weeks
            {streak > 0 && <> · <span className="font-bold text-gold-deep">{streak}-day streak</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-ink/40">
          <span>Less</span>
          {SHADES.map((s, i) => <span key={i} className={`h-3 w-3 rounded-[3px] ${s}`} />)}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="flex gap-[3px] pl-1 text-[10px] text-ink/35">
            {labels.map((l, i) => <span key={i} className="w-3 flex-shrink-0">{l}</span>)}
          </div>
          <div className="mt-1 flex gap-[3px] pl-1">
            {grid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((d) => (
                  <span key={d.date}
                    onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}
                    title={`${d.date} · ${d.count} activit${d.count === 1 ? "y" : "ies"}`}
                    className={`h-3 w-3 flex-shrink-0 rounded-[3px] transition ${SHADES[d.level]}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 h-4 text-[12px] font-semibold text-ink/55">
        {hover ? `${new Date(`${hover.date}T00:00:00Z`).toLocaleDateString("en-NG", { dateStyle: "medium", timeZone: "UTC" })} — ${hover.count} activit${hover.count === 1 ? "y" : "ies"}` : ""}
      </p>
    </div>
  );
}
