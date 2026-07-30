// Per-subject averages from a learner's graded submissions — the same rule the
// progress page uses (graded submissions only, averaged by the assignment's
// subject). Pure and testable.

export type SubjectAvg = { subject: string; pct: number; count: number };

export function subjectAverages(submissions: any[]): SubjectAvg[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const s of submissions ?? []) {
    if (s?.status !== "graded" || s?.grade == null) continue;
    const subject = s.assignment?.subject || "Other";
    const cur = map.get(subject) ?? { sum: 0, count: 0 };
    cur.sum += Number(s.grade);
    cur.count += 1;
    map.set(subject, cur);
  }
  return Array.from(map.entries())
    .map(([subject, d]) => ({ subject, pct: Math.round(d.sum / d.count), count: d.count }))
    .sort((a, b) => b.pct - a.pct);
}
