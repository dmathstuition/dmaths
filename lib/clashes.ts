// Timetable clash detection.
//
// A class occupies [starts_at, starts_at + duration_minutes). Two classes clash
// when those windows overlap — touching is fine (a 4:00–5:00 followed by a
// 5:00–6:00 is a back-to-back, not a double booking).
//
// Pure and dependency-free so the arithmetic can be tested without a database;
// the route supplies the rows.

export type Slot = { startsAt: string | number | Date; durationMinutes: number };

export type ExistingClass = Slot & {
  id: string;
  subject: string;
  tutorId?: string | null;
  studentIds?: string[];
};

export type Clash = {
  kind: "tutor" | "learners";
  classId: string;
  subject: string;
  startsAt: string;
  /** Learner ids caught by this clash — empty for a tutor clash. */
  studentIds: string[];
};

const ms = (v: string | number | Date) => new Date(v).getTime();

// Half-open intervals: an end that equals the next start does NOT overlap.
export function overlaps(a: Slot, b: Slot): boolean {
  const aStart = ms(a.startsAt);
  const bStart = ms(b.startsAt);
  if (isNaN(aStart) || isNaN(bStart)) return false;
  const aEnd = aStart + Math.max(0, a.durationMinutes) * 60_000;
  const bEnd = bStart + Math.max(0, b.durationMinutes) * 60_000;
  return aStart < bEnd && bStart < aEnd;
}

// Everything already booked that would collide with `candidate`:
//   • the same tutor teaching something else at that time
//   • any of these learners sitting in another class at that time
// `ignoreIds` skips the class being edited (and its own series).
export function findClashes(
  candidate: Slot & { tutorId?: string | null; studentIds?: string[] },
  existing: ExistingClass[],
  ignoreIds: string[] = [],
): Clash[] {
  const skip = new Set(ignoreIds);
  const learners = new Set(candidate.studentIds ?? []);
  const clashes: Clash[] = [];

  for (const other of existing) {
    if (skip.has(other.id)) continue;
    if (!overlaps(candidate, other)) continue;

    const startsAt = new Date(other.startsAt).toISOString();

    if (candidate.tutorId && other.tutorId && candidate.tutorId === other.tutorId) {
      clashes.push({ kind: "tutor", classId: other.id, subject: other.subject, startsAt, studentIds: [] });
    }

    const both = (other.studentIds ?? []).filter((id) => learners.has(id));
    if (both.length) {
      clashes.push({ kind: "learners", classId: other.id, subject: other.subject, startsAt, studentIds: both });
    }
  }

  return clashes;
}

// The window a set of candidate slots spans, widened by the longest possible
// class, so one query can fetch every row that could overlap any of them.
export function searchWindow(slots: Slot[], maxClassMinutes = 300): { from: string; to: string } | null {
  if (!slots.length) return null;
  const starts = slots.map((s) => ms(s.startsAt)).filter((n) => !isNaN(n));
  if (!starts.length) return null;
  const ends = slots.map((s) => ms(s.startsAt) + s.durationMinutes * 60_000).filter((n) => !isNaN(n));
  return {
    from: new Date(Math.min(...starts) - maxClassMinutes * 60_000).toISOString(),
    to: new Date(Math.max(...ends) + maxClassMinutes * 60_000).toISOString(),
  };
}
