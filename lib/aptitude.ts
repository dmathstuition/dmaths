// Aptitude test — pure helpers shared by the API, admin, learner and parent
// surfaces. An aptitude test is an AI-drafted, admin-approved diagnostic a new
// learner sits in the portal so the academy can pitch teaching at the right
// level. Kept dependency-free so the scoring/levelling is unit-testable.

export type AptitudeQuestion = { question: string; options: string[]; answer: number };

// Lifecycle:
//   draft      — AI generated, admin previewing/editing (not visible to family)
//   scheduled  — admin approved; parent picks a start time (scheduled_at)
//   submitted  — learner has taken it; score recorded
//   analyzed   — AI analysis drafted; admin reviewing/editing the report
//   reported   — report released to the parent/learner
export type AptitudeStatus = "draft" | "scheduled" | "submitted" | "analyzed" | "reported";

export const APTITUDE_STATUSES: AptitudeStatus[] = ["draft", "scheduled", "submitted", "analyzed", "reported"];

export function statusLabel(s: string): string {
  switch (s) {
    case "draft": return "Draft — preview";
    case "scheduled": return "Scheduled";
    case "submitted": return "Awaiting analysis";
    case "analyzed": return "In review";
    case "reported": return "Reported";
    default: return s;
  }
}

// A well-formed MC question: 2–6 options and an answer index in range.
export function validAptitudeQuestion(q: any): q is AptitudeQuestion {
  return !!q && typeof q.question === "string" && q.question.trim().length > 0
    && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6
    && q.options.every((o: any) => typeof o === "string")
    && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length;
}

export function cleanQuestions(list: unknown): AptitudeQuestion[] {
  return (Array.isArray(list) ? list : [])
    .map((q: any) => ({
      question: String(q?.question ?? "").trim(),
      options: (Array.isArray(q?.options) ? q.options : []).slice(0, 6).map((o: any) => String(o ?? "").trim()),
      answer: Number(q?.answer) || 0,
    }))
    .filter(validAptitudeQuestion);
}

export type AptitudeScore = { score: number; total: number; percent: number; band: string; summary: string };

// Band + a one-line seed the AI/admin report can build on.
export function bandFor(percent: number): { band: string; summary: string } {
  if (percent >= 80) return { band: "Excellent", summary: "Working comfortably above the expected level — ready to stretch." };
  if (percent >= 65) return { band: "Strong", summary: "A solid grasp of the fundamentals with room to push further." };
  if (percent >= 50) return { band: "Developing", summary: "Core ideas are forming; targeted practice will lift this quickly." };
  if (percent >= 35) return { band: "Emerging", summary: "Some foundations in place; needs structured support on key gaps." };
  return { band: "Needs foundations", summary: "Best served by rebuilding the fundamentals from the ground up." };
}

export function scoreAptitude(questions: AptitudeQuestion[], answers: Record<string, number> | null | undefined): AptitudeScore {
  const total = questions.length;
  let score = 0;
  for (let i = 0; i < total; i++) {
    const chosen = answers?.[String(i)];
    if (Number.isInteger(chosen) && chosen === questions[i].answer) score++;
  }
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const { band, summary } = bandFor(percent);
  return { score, total, percent, band, summary };
}

// Can the learner start this test right now?
export function canLearnerStart(test: { status?: string; scheduled_at?: string | null }, now: Date = new Date()): boolean {
  if (test.status !== "scheduled") return false;
  if (!test.scheduled_at) return false; // parent hasn't picked a time yet
  return new Date(test.scheduled_at).getTime() <= now.getTime();
}

// Is the family still waiting for a scheduled time to arrive?
export function isAwaitingSchedule(test: { status?: string; scheduled_at?: string | null }): boolean {
  return test.status === "scheduled" && !test.scheduled_at;
}
