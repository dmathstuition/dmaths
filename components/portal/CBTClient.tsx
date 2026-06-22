"use client";
import { useState, useEffect, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";

type Question = {
  id: number;
  question: string;
  code?: string;
  options: string[];
  answer?: number;
  correctAnswer?: number;
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function CBTClient({
  submission, questions, assignmentTitle, subject, cbtClose,
}: {
  submission: any;
  questions: Question[];
  assignmentTitle: string;
  subject: string;
  cbtClose?: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ grade: number; correct: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(() => {
    if (!cbtClose) return null;
    return Math.max(0, Math.floor((new Date(cbtClose).getTime() - Date.now()) / 1000));
  });

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const hasAutoSubmitted = useRef(false);

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const total = questions.length;

  function selectOption(optIndex: number) {
    setAnswers(prev => ({ ...prev, [current]: optIndex }));
  }

  async function doSubmit() {
    if (hasAutoSubmitted.current && submitted) return;
    hasAutoSubmitted.current = true;
    setConfirmSubmit(false);
    setBusy(true); setError("");

    const answerArray: (number | null)[] = questions.map((_, i) => answersRef.current[i] ?? null);
    const res = await fetch("/api/cbt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: submission.id, answers: answerArray }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { hasAutoSubmitted.current = false; return setError(json.error || "Submission failed"); }
    setResult(json);
    setSubmitted(true);
  }

  // Countdown tick
  useEffect(() => {
    if (secsLeft === null || secsLeft <= 0 || submitted) return;
    const t = setTimeout(() => setSecsLeft(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [secsLeft, submitted]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secsLeft === 0 && !submitted && !hasAutoSubmitted.current) {
      doSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secsLeft]);

  if (submitted && result) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="boardgrid rounded-2xl bg-board p-8 text-center text-white">
          <p className="text-sm uppercase tracking-wider text-white/40">Your score</p>
          <p className="mt-2 font-display text-6xl font-bold">{result.grade}%</p>
          <p className="mt-2 text-white/60">{result.correct} out of {result.total} correct</p>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Review answers</h2>
          {questions.map((q, i) => {
            const picked = answers[i] ?? null;
            const ci = (typeof q.answer === "number" ? q.answer : q.correctAnswer);
            const isCorrect = picked === ci;
            return (
              <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-sm font-bold">{i + 1}. {q.question}</p>
                {q.code && <pre className="mt-2 overflow-x-auto rounded-lg bg-chalk p-3 font-mono text-[11px] whitespace-pre-wrap text-ink/70">{q.code}</pre>}
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <p key={j} className={`text-sm pl-4 ${j === ci ? "font-bold text-emerald-700" : j === picked && !isCorrect ? "font-bold text-red-600 line-through" : "text-ink/60"}`}>
                      {j === ci ? "✓ " : j === picked ? "✕ " : "  "}{opt}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <a href="/portal/assignments" className="btn-gold block w-full text-center">← Back to assignments</a>
      </div>
    );
  }

  const urgent = secsLeft !== null && secsLeft < 300;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="boardgrid rounded-2xl bg-board p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <p className="pill-gold mb-2">{subject}</p>
          {secsLeft !== null && (
            <span className={`font-mono text-sm font-bold tabular-nums ${urgent ? "animate-pulse text-red-300" : "text-white/60"}`}>
              {urgent && "⏱ "}{fmtTime(secsLeft)}
            </span>
          )}
        </div>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">{assignmentTitle}</h1>
        <p className="mt-1 text-sm text-white/50">{answered}/{total} answered</p>
      </div>

      {urgent && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-800">
          Less than 5 minutes remaining — your answers will be auto-submitted when the timer reaches 0.
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-900">{error}</p>}

      {/* Question navigation */}
      <div className="flex flex-wrap gap-2">
        {questions.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-9 w-9 rounded-lg text-sm font-bold transition
              ${current === i ? "bg-ink text-white" : answers[i] !== undefined ? "bg-gold-pale text-gold-deep border border-gold" : "bg-white border border-line text-ink/50"}`}>
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="card p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-ink/40 mb-2">Question {current + 1} of {total}</p>
        <p className="text-lg font-semibold leading-relaxed">{q.question}</p>
        {q.code && (
          <pre className="mt-3 overflow-x-auto rounded-xl bg-board p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-gold-soft">{q.code}</pre>
        )}
        <div className="mt-5 space-y-2">
          {q.options.map((opt, j) => (
            <button key={j} onClick={() => selectOption(j)}
              className={`w-full rounded-xl border px-5 py-3.5 text-left text-sm font-semibold transition
                ${answers[current] === j
                  ? "border-gold bg-gold-pale text-gold-deep ring-2 ring-gold/30"
                  : "border-line bg-white text-ink/70 hover:border-ink/20 hover:bg-chalk"}`}>
              <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {String.fromCharCode(65 + j)}
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button className="btn-ghost flex-1" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Previous</button>
        {current < total - 1 ? (
          <button className="btn-gold flex-1" onClick={() => setCurrent(c => c + 1)}>Next →</button>
        ) : (
          <button className="btn-ink flex-1" onClick={() => answered < total ? setConfirmSubmit(true) : doSubmit()} disabled={busy}>
            {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : `Submit (${answered}/${total})`}
          </button>
        )}
      </div>

      {confirmSubmit && (
        <ConfirmModal
          title="Submit with unanswered questions?"
          message={`You've answered ${answered} of ${total} questions. Unanswered questions will be marked wrong.`}
          confirmLabel="Submit anyway"
          onConfirm={doSubmit}
          onCancel={() => setConfirmSubmit(false)}
        />
      )}
    </div>
  );
}
