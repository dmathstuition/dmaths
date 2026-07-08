"use client";
import Calendar, { type CalendarEvent } from "@/components/Calendar";
import { fmtWATTime } from "@/lib/time";

export default function CalendarPage({
  classes, assignments, title,
}: {
  classes: any[];
  assignments: any[];
  title: string;
}) {
  const events: CalendarEvent[] = [];

  classes.forEach(c => {
    events.push({
      id: `class-${c.id}`,
      title: `${c.subject} — ${c.tutor}`,
      date: new Date(c.starts_at),
      type: "class",
      meta: `${c.platform} · ${c.duration_minutes} min`,
      link: c.link || undefined,
    });
  });

  assignments.forEach(a => {
    if (a.due_at || a.due_date) {
      events.push({
        id: `assign-${a.id}`,
        title: a.title,
        date: new Date(a.due_at ?? a.due_date),
        type: a.type === "cbt" ? "cbt" : "assignment",
        meta: `${a.subject}${a.type === "cbt" ? " · CBT" : ""}${a.due_at ? ` · due ${fmtWATTime(a.due_at)} WAT` : ""}`,
      });
    }
    if (a.type === "cbt" && a.cbt_open) {
      events.push({
        id: `cbt-open-${a.id}`,
        title: `${a.title} — CBT opens`,
        date: new Date(a.cbt_open),
        type: "cbt",
        meta: a.subject,
      });
    }
  });

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <div className="card p-6">
        <Calendar events={events} />
      </div>
    </div>
  );
}
