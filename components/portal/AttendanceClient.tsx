"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import CountUp from "@/components/landing/CountUp";
import Confetti from "@/components/ui/Confetti";

interface AttendanceRecord { session_date: string; present: boolean; }

export default function AttendanceClient({
  records, attendance,
}: {
  records: AttendanceRecord[]; attendance: number;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const recordMap = new Map(records.map(r => [r.session_date, r.present]));
  const presentCount = records.filter(r => r.present).length;
  const absentCount = records.length - presentCount;

  // Current "present" streak — most recent consecutive sessions attended.
  const streak = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.session_date.localeCompare(a.session_date));
    let n = 0;
    for (const r of sorted) { if (r.present) n++; else break; }
    return n;
  }, [records]);

  // A little celebration when attendance is strong.
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => { if (attendance >= 90 && records.length > 0) { const t = setTimeout(() => setCelebrate(1), 250); return () => clearTimeout(t); } }, [attendance, records.length]);

  const { year, month } = viewDate;
  const monthName = new Date(year, month, 1).toLocaleString("en-NG", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function prevMonth() {
    setViewDate(v => {
      const m = v.month === 0 ? 11 : v.month - 1;
      const y = v.month === 0 ? v.year - 1 : v.year;
      return { year: y, month: m };
    });
  }
  function nextMonth() {
    setViewDate(v => {
      const m = v.month === 11 ? 0 : v.month + 1;
      const y = v.month === 11 ? v.year + 1 : v.year;
      return { year: y, month: m };
    });
  }

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={44} /></div>

      {/* ── Attendance HUD ──────────────────────────────────────── */}
      <div className="boardgrid relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#10406F] via-[#0A2A4F] to-[#071C36] p-7 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 select-none text-xl float">📅</div>
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <Icon name="calendar" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">My attendance</h1>
            <p className="mt-1 text-sm text-white/50">
              Overall <span className="font-bold text-gold"><CountUp to={attendance} duration={1000} />%</span>
              {streak > 1 && <span className="ml-2">· 🔥 {streak}-session streak</span>}
            </p>
          </div>
          {streak > 1 && (
            <div className="rounded-2xl bg-white/5 px-4 py-2 text-center ring-1 ring-white/10">
              <p className="font-display text-2xl font-extrabold text-gold leading-none">🔥 {streak}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-white/45">Streak</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold"><CountUp to={records.length} duration={900} /></p>
          <p className="text-xs text-ink/40">📋 Total sessions</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold text-emerald-600"><CountUp to={presentCount} duration={900} /></p>
          <p className="text-xs text-ink/40">✅ Present</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold text-red-500"><CountUp to={absentCount} duration={900} /></p>
          <p className="text-xs text-ink/40">❌ Absent</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prevMonth} aria-label="Previous month" className="btn-ghost !px-4 text-sm" aria-controls="attendance-grid">‹</button>
          <h2 className="font-display text-lg font-semibold" aria-live="polite">{monthName}</h2>
          <button onClick={nextMonth} aria-label="Next month" className="btn-ghost !px-4 text-sm" aria-controls="attendance-grid">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-ink/35">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div id="attendance-grid" className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const status = recordMap.has(isoDate) ? (recordMap.get(isoDate) ? "present" : "absent") : "none";
            return (
              <div key={day}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-xs font-semibold
                  ${status === "present" ? "bg-emerald-100 text-emerald-700" :
                    status === "absent" ? "bg-red-100 text-red-600" : "text-ink/35"}`}>
                <span>{day}</span>
                {/* Colour alone can't carry the result — say it out loud too. */}
                {status !== "none" && <span className="sr-only">{status === "present" ? "Present" : "Absent"}</span>}
                {status !== "none" && (
                  <span aria-hidden="true" className={`mt-0.5 h-1.5 w-1.5 rounded-full ${status === "present" ? "bg-emerald-500" : "bg-red-400"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-4 text-xs text-ink/40">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Present</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />Absent</span>
        </div>
      </div>
    </div>
  );
}
