// Single source of truth for date/time display. D-Maths serves Nigeria, so all
// dates are shown in West Africa Time (WAT = UTC+1, no daylight saving) rather
// than the viewer's device timezone — otherwise a class set for 4 PM WAT shows
// as a different hour for anyone whose phone is on another timezone.

export const WAT_TZ = "Africa/Lagos";

/** Format an ISO string / Date / epoch in WAT. Defaults to "12 Jul 2026, 16:00". */
export function fmtWAT(
  input: string | number | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Date(input).toLocaleString("en-NG", { timeZone: WAT_TZ, ...opts });
}

/** Date-only label in WAT, e.g. "12 Jul 2026". */
export function fmtWATDate(input: string | number | Date): string {
  return new Date(input).toLocaleDateString("en-NG", { timeZone: WAT_TZ, dateStyle: "medium" });
}

/** Time-only label in WAT, e.g. "16:00". */
export function fmtWATTime(input: string | number | Date): string {
  return new Date(input).toLocaleTimeString("en-NG", { timeZone: WAT_TZ, timeStyle: "short" });
}

/**
 * Convert a date (yyyy-mm-dd) + time (HH:mm) that the admin typed *as WAT* into
 * a UTC ISO string for storage. Appending +01:00 forces WAT, independent of the
 * admin's device timezone.
 */
export function watToUtcISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00+01:00`).toISOString();
}

/** Convert a stored UTC ISO string back into { date, time } strings in WAT for form inputs. */
export function utcToWatParts(iso: string | number | Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WAT_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // en-CA renders midnight as "24" in some engines — normalise to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${hour}:${get("minute")}` };
}
