"use client";
import { useState } from "react";

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
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">My attendance</h1>
        <p className="mt-1 text-sm text-white/50">Overall: {attendance}%</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold">{records.length}</p>
          <p className="text-xs text-ink/40">Total sessions</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold text-emerald-600">{presentCount}</p>
          <p className="text-xs text-ink/40">Present</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl font-semibold text-red-500">{absentCount}</p>
          <p className="text-xs text-ink/40">Absent</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prevMonth} className="btn-ghost !min-h-[32px] !px-3 text-sm">‹</button>
          <h2 className="font-display text-lg font-semibold">{monthName}</h2>
          <button onClick={nextMonth} className="btn-ghost !min-h-[32px] !px-3 text-sm">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-ink/35">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
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
                {status !== "none" && (
                  <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${status === "present" ? "bg-emerald-500" : "bg-red-400"}`} />
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
