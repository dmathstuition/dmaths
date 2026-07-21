"use client";
import { useMemo, useState } from "react";
import { Icon } from "@/components/Icons";

type Row = { id: string; title: string; subject: string; due_date: string | null; targeted: number; completed: number; completion: number; average: number | null };
type Subject = { subject: string; targeted: number; completed: number; completion: number; average: number | null };

function barColor(pct: number) {
  return pct >= 75 ? "#059669" : pct >= 40 ? "#C8881F" : "#EF4444";
}
function gradeColor(g: number | null) {
  if (g === null) return "text-ink/30";
  return g >= 70 ? "text-emerald-600" : g >= 50 ? "text-amber-600" : "text-red-500";
}

export default function AssignmentAnalyticsClient({ rows, subjects }: { rows: Row[]; subjects: Subject[] }) {
  const [subject, setSubject] = useState("");
  const visible = useMemo(() => (subject ? rows.filter(r => r.subject === subject) : rows), [subject, rows]);

  const totalTargeted = rows.reduce((a, r) => a + r.targeted, 0);
  const totalCompleted = rows.reduce((a, r) => a + r.completed, 0);
  const overall = totalTargeted ? Math.round((totalCompleted / totalTargeted) * 100) : 0;
  const gradedAvgs = rows.map(r => r.average).filter((x): x is number => x !== null);
  const overallAvg = gradedAvgs.length ? Math.round(gradedAvgs.reduce((a, b) => a + b, 0) / gradedAvgs.length) : null;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="reports" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Assignment analytics</h1>
          <p className="mt-1 text-sm text-white/50">Completion and average scores across every assignment.</p>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="Assignments" value={String(rows.length)} />
        <Tile label="Overall completion" value={`${overall}%`} />
        <Tile label="Overall average" value={overallAvg === null ? "—" : `${overallAvg}%`} />
      </div>

      {/* Per subject */}
      <div className="card neu-card overflow-hidden">
        <div className="border-b border-line px-6 py-4"><h2 className="font-display text-lg font-semibold text-ink">By subject</h2></div>
        {subjects.length ? (
          <div className="divide-y divide-line/60">
            {subjects.map(s => (
              <div key={s.subject} className="flex items-center gap-4 px-5 py-3.5">
                <p className="w-32 flex-shrink-0 truncate text-sm font-bold text-ink">{s.subject}</p>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full" style={{ width: `${s.completion}%`, backgroundColor: barColor(s.completion) }} />
                  </div>
                </div>
                <p className="w-12 flex-shrink-0 text-right text-sm font-semibold text-ink/60">{s.completion}%</p>
                <p className={`w-14 flex-shrink-0 text-right font-display text-sm font-bold ${gradeColor(s.average)}`}>
                  {s.average === null ? "—" : `${s.average}%`}
                </p>
              </div>
            ))}
          </div>
        ) : <p className="p-6 text-center text-sm text-ink/40">No assignment data yet.</p>}
      </div>

      {/* Per assignment */}
      <div className="card neu-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">By assignment ({visible.length})</h2>
          <select className="field !min-h-[38px] w-auto py-1.5 text-sm" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s.subject} value={s.subject}>{s.subject}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
                <th className="px-5 py-3">Assignment</th><th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Done</th><th className="px-5 py-3 w-40">Completion</th><th className="px-5 py-3">Avg</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} className="border-t border-line/60">
                  <td className="px-5 py-3 font-semibold text-ink">{r.title}</td>
                  <td className="px-5 py-3 text-ink/55">{r.subject}</td>
                  <td className="px-5 py-3 text-ink/55">{r.completed}/{r.targeted}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full" style={{ width: `${r.completion}%`, backgroundColor: barColor(r.completion) }} />
                      </div>
                      <span className="w-9 text-right text-xs font-semibold text-ink/50">{r.completion}%</span>
                    </div>
                  </td>
                  <td className={`px-5 py-3 font-display font-bold ${gradeColor(r.average)}`}>{r.average === null ? "—" : `${r.average}%`}</td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={5} className="px-5 py-6 text-center text-ink/40">No assignments.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card neu-card p-5">
      <p className="font-display text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
