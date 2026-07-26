"use client";
import { Icon } from "@/components/Icons";
import { fmtWAT } from "@/lib/time";

export type ClashItem = {
  kind: "tutor" | "learners";
  subject: string;
  when: string;
  who?: string[];
};

// Shown when a class would be double-booked. Deliberately a warning with a way
// through, not a refusal — the person scheduling may know the clash is fine
// (a learner who has dropped that class, a tutor covering both rooms).
export default function ClashWarning({
  clashes, onConfirm, onCancel, busy = false,
}: {
  clashes: ClashItem[]; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  if (!clashes.length) return null;

  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-2.5">
        <Icon name="alertTriangle" className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-amber-900">
            That time is already booked
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] text-amber-900/80">
            {clashes.map((c, i) => (
              <li key={`${c.kind}-${i}`}>
                {c.kind === "tutor" ? (
                  <>The tutor already teaches <strong>{c.subject}</strong> at {fmtWAT(c.when)}.</>
                ) : (
                  <>
                    {describeWho(c.who ?? [])} already in <strong>{c.subject}</strong> at {fmtWAT(c.when)}.
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onCancel} className="btn-ghost !min-h-[40px]">Pick another time</button>
            <button onClick={onConfirm} disabled={busy}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50">
              {busy ? "Scheduling…" : "Schedule anyway"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// "Ada is" / "Ada and Ben are" / "Ada and 4 others are"
function describeWho(names: string[]): string {
  if (names.length === 0) return "A learner is";
  if (names.length === 1) return `${names[0]} is`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are`;
  return `${names[0]} and ${names.length - 1} others are`;
}
