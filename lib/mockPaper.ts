// Pure helpers for the A.I Mock Paper generator — the admin composes an
// exam-standard paper (WAEC / JAMB) for a subject or a random one, and it's
// saved into the question bank (exam-tagged) where Mock Exam mode draws from.
// Kept I/O-free so the standards, counts and random-subject pick are testable.

export type ExamStandard = {
  key: "WAEC" | "JAMB";
  label: string;
  defaultCount: number;
  minutes: number;
  blurb: string;
};

export const EXAM_STANDARDS: ExamStandard[] = [
  { key: "WAEC", label: "WAEC (SSCE)", defaultCount: 30, minutes: 45, blurb: "SSCE objective standard — syllabus-aligned, one best answer." },
  { key: "JAMB", label: "JAMB (UTME)", defaultCount: 40, minutes: 40, blurb: "UTME pace — concise, one mark each." },
];

// Common Nigerian WAEC/JAMB subjects — the pool a "random subject" draws from.
export const MOCK_SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry", "Biology",
  "Further Mathematics", "Economics", "Geography", "Government",
  "Commerce", "Agricultural Science", "Literature in English",
];

export const MOCK_PAPER_MAX = 40;
export const MOCK_PAPER_MIN = 5;

export function standardByKey(key: string | null | undefined): ExamStandard {
  return EXAM_STANDARDS.find((s) => s.key === key) ?? EXAM_STANDARDS[0];
}

// How many questions to draft — the requested count clamped to a sane range, or
// the exam's default when nothing valid is given.
export function mockPaperCount(std: ExamStandard, requested?: number | string): number {
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return std.defaultCount;
  return Math.max(MOCK_PAPER_MIN, Math.min(MOCK_PAPER_MAX, Math.round(n)));
}

// Resolve the subject: an explicit one is used as-is; blank or "random" picks
// one from the pool (rng injectable for tests).
export function resolveSubject(subject: string | null | undefined, rng: () => number = Math.random): string {
  const s = String(subject ?? "").trim();
  if (s && s.toLowerCase() !== "random") return s.slice(0, 80);
  return MOCK_SUBJECTS[Math.floor(rng() * MOCK_SUBJECTS.length)];
}

// The named group a generated paper is saved under, so it's easy to find in the
// bank and can also be nominated as a Boss.
export function mockGroupName(examKey: string, subject: string): string {
  return `${examKey} Mock · ${subject}`.slice(0, 80);
}
