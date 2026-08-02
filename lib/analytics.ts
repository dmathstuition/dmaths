// Pure aggregation for the admin Engagement analytics page. Kept free of I/O so
// the bucketing/rollups are unit-testable; the page reads rows with the service
// role and calls these.

const DAY = 86_400_000;

// Round to a whole percent, guarding divide-by-zero.
export function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

// Login-recency funnel from each learner's last_login_at. The active windows are
// cumulative (today ⊆ week ⊆ month); "dormant" is nobody in 30 days OR never
// logged in (null). Counts always sum sensibly against `total`.
export type ActivityBuckets = { total: number; today: number; week: number; month: number; dormant: number };

export function activityBuckets(lastLogins: (string | null | undefined)[], now: Date = new Date()): ActivityBuckets {
  const t = now.getTime();
  let today = 0, week = 0, month = 0, dormant = 0;
  for (const l of lastLogins) {
    if (!l) { dormant++; continue; }
    const age = t - new Date(l).getTime();
    if (age < 0) { today++; week++; month++; continue; } // clock skew — treat as just-now
    if (age < DAY) today++;
    if (age < 7 * DAY) week++;
    if (age < 30 * DAY) month++;
    if (age >= 30 * DAY) dormant++;
  }
  return { total: lastLogins.length, today, week, month, dormant };
}

// A learner is "on a streak" if their last active day was today or yesterday
// (WAT date strings, YYYY-MM-DD). streak_last_date is a plain date column.
export function isOnStreak(streakLastDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!streakLastDate) return false;
  const day = String(streakLastDate).slice(0, 10);
  const iso = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  const today = iso(now);
  const yesterday = iso(new Date(now.getTime() - DAY));
  return day === today || day === yesterday;
}

// Weekly activity volume for the last `weeks` seven-day windows ending now,
// oldest → newest. Two independent date lists (e.g. practice + mock sessions)
// are bucketed onto the same weeks so they can share one chart.
export type WeekBucket = { label: string; practice: number; mock: number };

export function weeklyActivity(
  practiceDates: (string | null | undefined)[],
  mockDates: (string | null | undefined)[],
  weeks = 8,
  now: Date = new Date(),
): WeekBucket[] {
  const t = now.getTime();
  const buckets: WeekBucket[] = [];
  const startLabels: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(t - (i + 1) * 7 * DAY + DAY); // window start day
    startLabels.push(start.toLocaleDateString("en-NG", { day: "numeric", month: "short" }));
    buckets.push({ label: startLabels[startLabels.length - 1], practice: 0, mock: 0 });
  }
  const add = (dates: (string | null | undefined)[], key: "practice" | "mock") => {
    for (const d of dates) {
      if (!d) continue;
      const age = t - new Date(d).getTime();
      if (age < 0 || age >= weeks * 7 * DAY) continue;
      const idx = weeks - 1 - Math.floor(age / (7 * DAY));
      if (idx >= 0 && idx < weeks) buckets[idx][key] += 1;
    }
  };
  add(practiceDates, "practice");
  add(mockDates, "mock");
  return buckets;
}
