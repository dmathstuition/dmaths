import { Icon, type IconName } from "@/components/Icons";
import type { WeeklySummary as Summary } from "@/lib/weeklySummary";

// A parent-facing "week in review" for one child — the last 7 days rolled up
// from the newer activity tables (practice, mock exams, attendance, streak,
// behaviour). Complements the always-current snapshot below it.
export default function WeeklySummary({ name, summary }: { name: string; summary: Summary }) {
  const s = summary;
  const attendPct = s.classes > 0 ? Math.round((s.present / s.classes) * 100) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold-pale/60 to-white p-5 dark:from-white/5 dark:to-transparent sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold-deep"><Icon name="sparkles" className="h-5 w-5" /></span>
        <div>
          <h3 className="font-display text-base font-bold text-ink">{name}&apos;s week</h3>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">Last 7 days</p>
        </div>
      </div>

      {!s.active && s.streak === 0 ? (
        <p className="rounded-xl bg-white/60 px-4 py-3 text-sm text-ink/55 dark:bg-white/5">
          A quiet week — no lessons, practice or tests recorded yet. A gentle nudge from you goes a long way. 💛
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {attendPct != null && (
            <Stat icon="calendar" label="Attendance" value={`${s.present}/${s.classes}`} note={`${attendPct}% present`} />
          )}
          {s.streak > 0 && (
            <Stat icon="flame" label="Streak" value={`${s.streak}`} note={s.streak === 1 ? "day" : "days"} tint="gold" />
          )}
          {s.practiceRounds > 0 && (
            <Stat icon="target" label="Practice" value={`${s.practiceRounds}`} note={s.practiceRounds === 1 ? "round" : "rounds"} />
          )}
          {s.mocks > 0 && (
            <Stat icon="graduationCap" label="Mock exams" value={`${s.mocks}`}
              note={s.bestMockPercent != null ? `best ${s.bestMockBand || `${s.bestMockPercent}%`}` : ""} />
          )}
          {s.assignmentsGraded > 0 && (
            <Stat icon="assignments" label="Graded" value={`${s.assignmentsGraded}`}
              note={s.avgGrade != null ? `avg ${s.avgGrade}%` : ""} />
          )}
          {s.pointsThisWeek > 0 && (
            <Stat icon="coins" label="Points earned" value={`${s.pointsThisWeek}`} note="this week" tint="gold" />
          )}
          {(s.positiveNotes > 0 || s.negativeNotes > 0) && (
            <Stat icon="heart" label="Behaviour"
              value={`${s.positiveNotes > 0 ? `+${s.positiveNotes}` : ""}${s.positiveNotes > 0 && s.negativeNotes > 0 ? " / " : ""}${s.negativeNotes > 0 ? `−${s.negativeNotes}` : ""}`}
              note={s.negativeNotes > 0 ? "some to review" : "all positive"}
              tint={s.negativeNotes > 0 ? "red" : "green"} />
          )}
        </div>
      )}
    </div>
  );
}

const TINTS: Record<string, string> = {
  default: "bg-white/70 text-ink dark:bg-white/5",
  gold: "bg-gold/10 text-gold-deep",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10",
  red: "bg-red-50 text-red-700 dark:bg-red-500/10",
};

function Stat({ icon, label, value, note, tint = "default" }: {
  icon: IconName; label: string; value: string; note?: string; tint?: string;
}) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ${TINTS[tint]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-70">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-0.5 font-display text-lg font-extrabold leading-tight">{value}</p>
      {note && <p className="text-[11px] opacity-60">{note}</p>}
    </div>
  );
}
