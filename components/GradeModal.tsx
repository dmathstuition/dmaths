"use client";
import { useEffect, useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const g = Number(grade);
  const valid = grade !== "" && !isNaN(g) && g >= 0 && g <= 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog" aria-modal="true">
      <div className="card w-full max-w-sm p-6">
        <h2 className="font-display text-lg font-semibold">Grade submission</h2>
        <p className="mt-1 text-sm text-ink/60">{studentName} — {assignmentTitle}</p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="flabel">Grade (0–100)</label>
            <input ref={inputRef} className="field" type="number" min={0} max={100}
              value={grade} onChange={e => setGrade(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && valid) onConfirm(g, feedback); }} />
          </div>
          <div>
            <label className="flabel">Feedback <span className="font-normal text-ink/40">(optional)</span></label>
            <textarea className="field min-h-[72px]" placeholder="e.g. Great work on…"
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
