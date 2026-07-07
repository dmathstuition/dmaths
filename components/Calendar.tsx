"use client";
import { useState, useMemo } from "react";
import { fmtWATTime } from "@/lib/time";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: "class" | "assignment" | "cbt" | "notice";
  meta?: string;
  link?: string;
};

const TYPE_STYLES = {
  class:      { dot: "bg-blue-500",    chip: "bg-blue-50 text-blue-700 ring-blue-200",       pill: "pill-blue",   label: "Class" },
  assignment: { dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700 ring-amber-200",    pill: "pill-amber",  label: "Due" },
  cbt:        { dot: "bg-purple-500",  chip: "bg-purple-50 text-purple-700 ring-purple-200", pill: "pill bg-purple-100 text-purple-800", label: "CBT" },
  notice:     { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", pill: "pill-green", label: "Notice" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// A timed event ("class"/"cbt") gets a WAT time label; a due date shows "Due".
const isTimed = (t: CalendarEvent["type"]) => t === "class" || t === "cbt";

export default function Calendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        (map[d.getDate()] ??= []).push(e);
      }
    });
    // Keep each day's events in chronological order.
    Object.values(map).forEach(list => list.sort((a, b) => +a.date - +b.date));
    return map;
  }, [events, year, month]);

  // Next few upcoming events (from now), for the agenda strip.
  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter(e => +e.date >= now - 3_600_000)
      .sort((a, b) => +a.date - +b.date)
      .slice(0, 6);
  }, [events]);

  const selectedEvents = selected ? eventsByDay[selected] ?? [] : [];

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
    setSelected(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
    setSelected(null);
  }
  function goToday() {
    setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(today.getDate());
  }

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={prev} aria-label="Previous month" className="btn-ghost !min-h-[38px] !px-3">◂</button>
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold leading-tight">{MONTHS[month]} {year}</h2>
          <button onClick={goToday} className="text-[11px] font-bold text-gold-deep hover:underline">Today</button>
        </div>
        <button onClick={next} aria-label="Next month" className="btn-ghost !min-h-[38px] !px-3">▸</button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-ink/40">
        {DAYS.map(d => <div key={d} className="py-1.5">{d}</div>)}
      </div>

      {/* Grid */}
      <div key={`${year}-${month}`} className="page-enter grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day] ?? [] : [];
          const isSel = day !== null && selected === day;
          return (
            <button
              key={i}
              disabled={day === null}
              onClick={() => day && setSelected(day)}
              className={`relative min-h-[58px] p-1.5 text-left align-top transition hover:bg-chalk/60 disabled:bg-chalk/30 sm:min-h-[84px]
                ${isSel ? "ring-2 ring-inset ring-gold" : ""}
                ${isToday(day!) ? "bg-gold-pale" : "bg-white"}`}
            >
              {day && (
                <>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                    ${isToday(day) ? "bg-gold text-board" : "text-ink/70"}`}>{day}</span>
                  {/* Desktop: mini event chips with time. Mobile: dots. */}
                  <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {dayEvents.slice(0, 2).map(e => (
                      <span key={e.id} className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold ring-1 ${TYPE_STYLES[e.type].chip}`}>
                        {isTimed(e.type) ? `${fmtWATTime(e.date)} ` : ""}{e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="pl-1 text-[10px] font-bold text-ink/40">+{dayEvents.length - 2} more</span>}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {dayEvents.slice(0, 4).map(e => (
                        <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${TYPE_STYLES[e.type].dot}`} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && (
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-ink/45">
            {MONTHS[month]} {selected}, {year} — {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
          </h3>
          {selectedEvents.length === 0 && <p className="text-sm text-ink/40">Nothing scheduled for this day.</p>}
          <div className="space-y-2">
            {selectedEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${TYPE_STYLES[e.type].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.title}</p>
                  <p className="text-xs text-ink/45">
                    {isTimed(e.type) ? `${fmtWATTime(e.date)} WAT` : "All day"}{e.meta ? ` · ${e.meta}` : ""}
                  </p>
                </div>
                <span className={TYPE_STYLES[e.type].pill}>{TYPE_STYLES[e.type].label}</span>
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gold-deep hover:underline">Open</a>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming agenda */}
      {upcoming.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-ink/60">⏭️ Coming up</h3>
          <div className="space-y-2">
            {upcoming.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${TYPE_STYLES[e.type].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold text-ink/50">
                  {new Date(e.date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" })}
                  {isTimed(e.type) ? `, ${fmtWATTime(e.date)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(TYPE_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
            <span className="capitalize text-ink/50">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { CalendarEvent };
