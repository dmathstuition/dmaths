"use client";
import { Icon } from "@/components/Icons";

type SegScore = { segment: string; score: number; total: number; percent: number };
type Test = {
  id: string; status: string; scheduled_at: string | null;
  score: number | null; total: number | null; report: string | null;
  segments?: SegScore[];
};

// Parent view of a child's aptitude test. The test TIME is chosen during
// registration and the learner sits it in their OWN portal — so this card only
// keeps the parent informed and shows the report once released. There is no
// scheduling here.
export default function AptitudeParentCard({ test, childName }: { test: Test | null; childName: string }) {
  if (!test) return null;
  const fmt = (s: string) => new Date(s).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  if (test.status === "scheduled" && test.scheduled_at) {
    return (
      <div className="card neu-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink/75">
          <Icon name="calendar" className="h-5 w-5 text-gold-deep" />
          {childName}&apos;s aptitude test is booked for <strong>{fmt(test.scheduled_at)}</strong> — they&apos;ll sit it in their own portal.
        </p>
      </div>
    );
  }

  if (test.status === "scheduled" && !test.scheduled_at) {
    return (
      <div className="card neu-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink/75">
          <Icon name="clock" className="h-5 w-5 text-gold-deep" />
          {childName}&apos;s aptitude test is being scheduled — we&apos;ll confirm the time with you.
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
        {test.segments && test.segments.length > 1 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">By section</p>
            {test.segments.map((s) => (
              <div key={s.segment}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink/70">{s.segment}</span>
                  <span className="font-bold text-ink">{s.score}/{s.total} · {s.percent}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink/75">{test.report}</p>
      </div>
    );
  }

  return null;
}
