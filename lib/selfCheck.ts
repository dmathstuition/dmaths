// Parsing for the learner "Check my work" helper: the AI returns a mark out of
// 10 and written feedback; this keeps the mark in range whatever it sends back.
// Pure so it's unit-testable; the API calls the model and passes its JSON here.

export const SELF_CHECK_MAX = 10;
export type SelfCheck = { mark: number; feedback: string };

export function parseSelfCheck(raw: any): SelfCheck {
  const m = Number(raw?.mark);
  const mark = Number.isFinite(m) ? Math.max(0, Math.min(SELF_CHECK_MAX, Math.round(m))) : 0;
  const feedback = String(raw?.feedback ?? "").trim().slice(0, 2000);
  return { mark, feedback };
}
