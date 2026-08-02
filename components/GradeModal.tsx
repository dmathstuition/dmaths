"use client";
import { useId, useRef, useState } from "react";
import { useDialog } from "@/lib/useDialog";
import { Icon } from "@/components/Icons";

export default function GradeModal({
  studentName, assignmentTitle, initialGrade, initialFeedback, onConfirm, onCancel,
  subject, learner, work,
}: {
  studentName: string;
  assignmentTitle: string;
  initialGrade: number | null;
  initialFeedback: string;
  onConfirm: (grade: number, feedback: string) => void;
  onCancel: () => void;
  subject?: string;
  learner?: string;
  work?: string;
}) {
  const [grade, setGrade] = useState(initialGrade !== null ? String(initialGrade) : "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const gradeId = useId();
  const feedbackId = useId();

  async function draftFeedback() {
    setDrafting(true); setDraftErr("");
    try {
      const g = grade !== "" && !isNaN(Number(grade)) ? Number(grade) : null;
      const res = await fetch("/api/ai/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: assignmentTitle, subject, grade: g, learner, work }),
      });
      const j = await res.json();
      if (res.ok && j.feedback) setFeedback(j.feedback);
      else setDraftErr(j.error || "Couldn't draft feedback.");
    } catch { setDraftErr("Couldn't draft feedback — try again."); }
    finally { setDrafting(false); }
  }

  // Focuses the grade field, traps Tab, Esc cancels, focus returns to the row
  // the tutor opened this from.
  useDialog(true, onCancel, panelRef);

  const g = Number(grade);
  const valid = grade !== "" && !isNaN(g) && g >= 0 && g <= 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={panelRef} className="card w-full max-w-sm p-6">
        <h2 id={titleId} className="font-display text-lg font-semibold">Grade submission</h2>
        <p className="mt-1 text-sm text-ink/60">{studentName} — {assignmentTitle}</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="flabel" htmlFor={gradeId}>Grade (0–100)</label>
            <input id={gradeId} className="field" type="number" min={0} max={100}
              value={grade} onChange={e => setGrade(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && valid) onConfirm(g, feedback); }} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="flabel !mb-0" htmlFor={feedbackId}>Feedback <span className="font-normal text-ink/40">(optional)</span></label>
              <button type="button" onClick={draftFeedback} disabled={drafting}
                title="Draft feedback with A.I"
                className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-white px-2.5 py-1 text-[11px] font-bold text-gold-deep transition hover:bg-gold-pale disabled:opacity-50">
                <Icon name="sparkles" className="h-3.5 w-3.5" /> {drafting ? "Drafting…" : "Draft with A.I"}
              </button>
            </div>
            <textarea id={feedbackId} className="field min-h-[72px]" placeholder="e.g. Great work on…"
              value={feedback} onChange={e => setFeedback(e.target.value)} />
            {draftErr && <p className="mt-1 text-xs font-semibold text-red-600">{draftErr}</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
          <button className="btn-gold flex-1" onClick={() => onConfirm(g, feedback)} disabled={!valid}>
            Save grade
          </button>
        </div>
      </div>
    </div>
  );
}
