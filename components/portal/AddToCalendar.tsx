"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { googleCalUrl, icsDataUri, type CalEvent } from "@/lib/calendar";

// Small "add to calendar" control for a class — Google (opens a template) and
// Apple/Outlook (.ics download). Unobtrusive icon button + popover.
export default function AddToCalendar({ event, label = false }: { event: CalEvent; label?: boolean }) {
  const [open, setOpen] = useState(false);
  const safe = (event.subject || "class").replace(/[^\w-]+/g, "_");

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Add class to calendar"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink/60 transition hover:bg-chalk dark:bg-white/5 dark:text-white/70">
        <Icon name="calendar" className="h-3.5 w-3.5" />{label && <span>Add to calendar</span>}
      </button>
      {open && (
        <>
          <button aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-white shadow-xl dark:border-white/10 dark:bg-board">
            <a href={googleCalUrl(event)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-semibold text-ink/75 hover:bg-chalk dark:text-white/75 dark:hover:bg-white/5">
              Google Calendar
            </a>
            <a href={icsDataUri(event)} download={`${safe}.ics`} onClick={() => setOpen(false)}
              className="block border-t border-line px-3 py-2.5 text-sm font-semibold text-ink/75 hover:bg-chalk dark:border-white/10 dark:text-white/75 dark:hover:bg-white/5">
              Apple / Outlook (.ics)
            </a>
          </div>
        </>
      )}
    </div>
  );
}
