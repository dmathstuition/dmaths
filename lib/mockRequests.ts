// Pure rules for the mock-exam request→authorize flow. Kept free of I/O so the
// "can this learner start now?" logic is shared by the API (which enforces it)
// and the UI (which shows it), and is unit-testable.

export type MockReqStatus = "pending" | "approved" | "declined" | "used";

export type MockRequestLike = {
  status: string;
  scheduled_for?: string | null;
};

// A learner may start a mock only when it's approved and (if a start time was
// set) that time has arrived. Declined/used/pending can never start.
export function canStart(req: MockRequestLike, now: Date = new Date()): boolean {
  if (req.status !== "approved") return false;
  if (req.scheduled_for && new Date(req.scheduled_for).getTime() > now.getTime()) return false;
  return true;
}

// True while an approved request is still waiting for its scheduled start time.
export function isScheduledAhead(req: MockRequestLike, now: Date = new Date()): boolean {
  return req.status === "approved" && !!req.scheduled_for && new Date(req.scheduled_for).getTime() > now.getTime();
}

export const REQ_STATUS_META: Record<MockReqStatus, { label: string; cls: string }> = {
  pending:  { label: "Awaiting approval", cls: "bg-gold-pale text-gold-deep" },
  approved: { label: "Approved",          cls: "bg-emerald-50 text-emerald-600" },
  declined: { label: "Declined",          cls: "bg-red-50 text-red-500" },
  used:     { label: "Completed",         cls: "bg-ink/5 text-ink/50" },
};

export function reqStatusMeta(status: string): { label: string; cls: string } {
  return REQ_STATUS_META[(status as MockReqStatus)] ?? REQ_STATUS_META.pending;
}
