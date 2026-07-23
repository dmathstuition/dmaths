// Build "add to calendar" links for a class — a Google Calendar template URL and
// an .ics data URI (Apple/Outlook). Pure + unit-tested.

export type CalEvent = {
  subject: string;
  starts_at: string;            // ISO timestamp
  duration_minutes?: number;    // defaults to 60
  platform?: string;
  link?: string;
  location?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

// UTC "basic" format required by both Google (dates=) and iCalendar.
function toUtcStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}

function bounds(c: CalEvent): { start: Date; end: Date } {
  const start = new Date(c.starts_at);
  const end = new Date(start.getTime() + (c.duration_minutes ?? 60) * 60_000);
  return { start, end };
}

function description(c: CalEvent): string {
  const parts: string[] = [];
  if (c.platform) parts.push(`Platform: ${c.platform}`);
  if (c.link) parts.push(`Join: ${c.link}`);
  return parts.join("\n");
}

export function googleCalUrl(c: CalEvent): string {
  const { start, end } = bounds(c);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${c.subject} — D-Maths`,
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
    details: description(c),
  });
  const loc = c.location || c.link;
  if (loc) params.set("location", loc);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Escape per RFC 5545 (backslash, semicolon, comma, newline).
function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function icsText(c: CalEvent): string {
  const { start, end } = bounds(c);
  const loc = c.location || c.link;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//D-Maths//Portal//EN", "BEGIN:VEVENT",
    `UID:${toUtcStamp(start)}-${Math.random().toString(36).slice(2)}@dmaths`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(start)}`, `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcs(`${c.subject} — D-Maths`)}`,
    `DESCRIPTION:${escapeIcs(description(c))}`,
    ...(loc ? [`LOCATION:${escapeIcs(loc)}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function icsDataUri(c: CalEvent): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsText(c))}`;
}
