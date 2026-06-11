"use client";
import { useState, useMemo } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: "class" | "assignment" | "cbt" | "notice";
  meta?: string;
  link?: string;
};

const TYPE_STYLES = {
  class:      { dot: "bg-blue-500",    pill: "pill-blue",   label: "Class" },
  assignment: { dot: "bg-amber-500",   pill: "pill-amber",  label: "Due" },
  cbt:        { dot: "bg-purple-500",  pill: "pill bg-purple-100 text-purple-800", label: "CBT" },
  notice:     { dot: "bg-emerald-500", pill: "pill-green",  label: "Notice" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Calendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

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
    return map;
  }, [events, year, month]);

  const selectedKey = selected;
  const selectedDay = selected ? parseInt(selected) : null;
  const selectedEvents = selectedDay ? eventsByDay[selectedDay] ?? [] : [];

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={prev} className="btn-ghost !min-h-[36px] !px-3">◂</button>
        <h2 className="font-display text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={next} className="btn-ghost !min-h-[36px] !px-3">▸</button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-ink/40">
        {DAYS.map(d => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl bg-line overflow-hidden">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay[day] ?? [] : [];
          const isSel = day !== null && selected === String(day);
          return (
            <button
              key={i}
              disabled={day === null}
              onClick={() => day && setSelected(String(day))}
              className={`relative min-h-[64px] bg-white p-1.5 text-left transition hover:bg-chalk/50 disabled:bg-chalk/30
                ${isSel ? "ring-2 ring-inset ring-gold" : ""}
                ${isToday(day!) ? "bg-gold-pale" : ""}`}
            >
              {day && (
                <>
                  <span className={`text-xs font-semibold ${isToday(day) ? "text-gold-deep" : "text-ink/70"}`}>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((e, j) => (
                        <span key={j} className={`h-1.5 w-1.5 rounded-full ${TYPE_STYLES[e.type].dot}`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[9px] text-ink/40">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-ink/45">
            {MONTHS[month]} {selectedDay}, {year} — {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
          </h3>
          {selectedEvents.length === 0 && <p className="text-sm text-ink/40">Nothing scheduled for this day.</p>}
          <div className="space-y-2">
            {selectedEvents.map(e => (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${TYPE_STYLES[e.type].dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{e.title}</p>
                  {e.meta && <p className="text-xs text-ink/45">{e.meta}</p>}
                </div>
                <span className={TYPE_STYLES[e.type].pill}>{TYPE_STYLES[e.type].label}</span>
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gold-deep hover:underline">Open</a>}
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
            <span className="text-ink/50 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { CalendarEvent };
