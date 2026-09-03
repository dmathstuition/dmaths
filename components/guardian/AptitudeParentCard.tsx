"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Test = {
  id: string; status: string; scheduled_at: string | null;
  score: number | null; total: number | null; report: string | null;
};

// Shown in the parent portal for one child. Lets a parent pick the time their
// child sits the aptitude test, and read the report once it's released.
export default function AptitudeParentCard({ test, childName }: { test: Test | null; childName: string }) {
  const router = useRouter();
  const push = useToast();
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  if (!test) return null;

  const fmt = (s: string) => new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  async function schedule() {
    if (!when) { push("Pick a date and time.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/aptitude/schedule", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: test!.id, scheduledAt: new Date(when).toISOString() }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { push(j.error || "Could not schedule.", "error"); return; }
    push("Test scheduled — thank you.", "success");
    router.refresh();
  }

  // Awaiting a time from the parent.
  if (test.status === "scheduled" && !test.scheduled_at) {
    return (
      <div className="card neu-card border-l-4 border-l-gold p-5">
        <p className="flex items-center gap-2 font-display text-base font-bold text-ink">
          <Icon name="calendar" className="h-5 w-5 text-gold-deep" /> Schedule {childName}&apos;s aptitude test
        </p>
        <p className="mt-1 text-sm text-ink/55">Pick a time that suits you — the test opens in {childName}&apos;s portal then.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="datetime-local" className="field !w-auto" value={when} onChange={e => setWhen(e.target.value)} />
          <button onClick={schedule} disabled={busy} className="btn-gold">{busy ? "Saving…" : "Schedule test"}</button>
        </div>
      </div>
    );
  }

  if (test.status === "scheduled" && test.scheduled_at) {
    return (
      <div className="card neu-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink/75">
          <Icon name="calendar" className="h-5 w-5 text-gold-deep" />
          {childName}&apos;s aptitude test is booked for <strong>{fmt(test.scheduled_at)}</strong>.
        </p>
      </div>
    );
  }

  if (["submitted", "analyzed"].includes(test.status)) {
    return (
      <div className="card neu-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink/75">
          <Icon name="clock" className="h-5 w-5 text-gold-deep" />
          {childName} has completed the aptitude test — we&apos;re preparing the report.
        </p>
      </div>
    );
  }

  if (test.status === "reported" && test.report) {
    return (
      <div className="card neu-card p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="reports" className="h-5 w-5 text-gold-deep" /> {childName}&apos;s aptitude report
        </h3>
        {test.score != null && test.total != null && (
          <p className="mt-1 text-sm font-bold text-gold-deep">Score: {test.score}/{test.total}</p>
        )}
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/75">{test.report}</p>
      </div>
    );
  }

  return null;
}
