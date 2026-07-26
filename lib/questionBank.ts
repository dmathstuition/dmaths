// Shared shape and validation for CBT questions.
//
// The same object is used three ways: written in the CBT builder, saved to the
// question bank, and stored on `assignments.cbt_questions` when a test is
// created. Keeping one validator means a question that passes here is one the
// marker can always mark.

export type BankQuestion = {
  question: string;
  code?: string;
  options: string[];
  answer: number;      // 0-based index into options
};

export type BankRow = BankQuestion & {
  id: string;
  subject: string;
  level: string;
  topic: string;
};

export const MAX_OPTIONS = 6;

// A question is usable only if it has text, at least two choices, and an answer
// that actually points at one of them. Returns the reason so the UI can say it.
export function validateQuestion(q: Partial<BankQuestion>): string | null {
  if (!String(q.question ?? "").trim()) return "Every question needs its text.";
  const options = (q.options ?? []).map((o) => String(o ?? "").trim());
  if (options.length < 2) return "A question needs at least two options.";
  if (options.some((o) => !o)) return "Every option needs text — remove the blank ones.";
  if (options.length > MAX_OPTIONS) return `A question can have at most ${MAX_OPTIONS} options.`;
  const answer = Number(q.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    return "Mark which option is the correct answer.";
  }
  return null;
}

// Trim and clamp before storing, so the bank never holds a question the marker
// would choke on.
export function normaliseQuestion(q: Partial<BankQuestion>): BankQuestion {
  const options = (q.options ?? []).map((o) => String(o ?? "").trim().slice(0, 300)).slice(0, MAX_OPTIONS);
  return {
    question: String(q.question ?? "").trim().slice(0, 2000),
    code: String(q.code ?? "").trim().slice(0, 4000),
    options,
    answer: Math.max(0, Math.min(options.length - 1, Math.round(Number(q.answer) || 0))),
  };
}

// Pick `count` questions at random without repeats. Used by "randomise N" when
// building a test from the bank; a stable rng makes it testable.
export function pickRandom<T>(items: T[], count: number, rng: () => number = Math.random): T[] {
  const pool = [...items];
  const out: T[] = [];
  const wanted = Math.max(0, Math.min(count, pool.length));
  for (let i = 0; i < wanted; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return out;
}

// Bank row → the shape a test stores. Ids are re-numbered from 1 so a test's
// questions read 1..n however they were picked.
export function toCbtQuestions(rows: BankQuestion[]): (BankQuestion & { id: number })[] {
  return rows.map((r, i) => ({
    id: i + 1,
    question: r.question,
    code: r.code ?? "",
    options: r.options,
    answer: r.answer,
  }));
}
