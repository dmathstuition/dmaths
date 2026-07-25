"use client";
import { useId, useRef, useState } from "react";
import { useDialog } from "@/lib/useDialog";

export default function GradeModal({
  studentName, assignmentTitle, initialGrade, initialFeedback, onConfirm, onCancel,
}: {
  studentName: string;
  assignmentTitle: string;
  initialGrade: number | null;
  initialFeedback: string;
  onConfirm: (grade: number, feedback: string) => void;
  onCancel: () => void;
}) {
  const [grade, setGrade] = useState(initialGrade !== null ? String(initialGrade) : "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const gradeId = useId();
  const feedbackId = useId();

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
            <label className="flabel" htmlFor={feedbackId}>Feedback <span className="font-normal text-ink/40">(optional)</span></label>
            <textarea id={feedbackId} className="field min-h-[72px]" placeholder="e.g. Great work on…"
              value={feedback} onChange={e => setFeedback(e.target.value)} />
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
