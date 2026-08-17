// The academy's subjects — the single canonical list a learner can be enrolled
// in. Used by the learner's subject setting (and anywhere a learner picks their
// subjects). Kept pure so the normalisation is unit-testable.

export const ACADEMY_SUBJECTS = [
  "Maths",
  "Furthermaths",
  "Physics",
  "Python",
  "Web development",
  "A.I and Automation",
] as const;

export type AcademySubject = (typeof ACADEMY_SUBJECTS)[number];

export function isAcademySubject(s: string): s is AcademySubject {
  return (ACADEMY_SUBJECTS as readonly string[]).includes(s);
}

// Keep only real academy subjects, trimmed and de-duplicated, preserving order.
// A learner's stored subjects always pass through here, so a stale value from an
// older list simply drops out rather than breaking anything downstream.
export function normalizeSubjects(list: unknown): AcademySubject[] {
  const seen = new Set<string>();
  const out: AcademySubject[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const v = String(raw ?? "").trim();
    if (isAcademySubject(v) && !seen.has(v)) { seen.add(v); out.push(v); }
  }
  return out;
}
