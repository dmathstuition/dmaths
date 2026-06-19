"use client";
import { useState } from "react";

// Admin-only CBT preview. Replays the SAME scoring rule as /api/cbt
// (accepts "answer" OR "correctAnswer"), entirely client-side, touching
// no student data — so you can verify a test scores correctly first.
const correctIndex = (q: any) =>
  typeof q.answer === "number" ? q.answer
  : typeof q.correctAnswer === "number" ? q.correctAnswer : -1;

export default function CBTPreview({ title, questions, onClose }: {
  title: string; questions: any[]; onClose: () => void;
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ correct: number; total: number; grade: number } | null>(null);

  function grade() {
    let correct = 0;
    questions.forEach((q, i) => { if (picked[i] === correctIndex(q)) correct++; });
    setResult({ correct, total: questions.length, grade: Math.round((correct / questions.length) * 100) });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Preview: {title}</h2>
            <p className="text-xs text-ink/45">Answer as a student would, then check the score. Nothing is saved.</p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-ink/5 px-3 py-1.5 text-sm font-bold text-ink/60 hover:bg-ink/10">Close</button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {questions.map((q, i) => {
            const ci = correctIndex(q);
            return (
              <div key={i} className="rounded-2xl border border-line p-4">
                <p className="font-semibold">{i + 1}. {q.question}</p>
                {q.code && <pre className="mt-2 overflow-x-auto rounded-lg bg-board p-3 font-mono text-[11px] whitespace-pre-wrap text-gold-soft">{q.code}</pre>}
                <div className="mt-3 space-y-2">
                  {q.options.map((opt: string, j: number) => {
                    const chosen = picked[i] === j;
                    const showAnswer = result && j === ci;
                    const wrongPick = result && chosen && j !== ci;
                    return (
                      <button key={j} disabled={!!result}
                        onClick={() => setPicked(p => ({ ...p, [i]: j }))}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition
                          ${showAnswer ? "border-emerald-400 bg-emerald-50 font-bold text-emerald-800"
                            : wrongPick ? "border-red-300 bg-red-50 text-red-700 line-through"
                            : chosen ? "border-gold bg-gold-pale text-gold-deep"
                            : "border-line hover:border-ink/30"}`}>
                        <span className="font-mono text-xs text-ink/40">{String.fromCharCode(65 + j)}</span>
                        {opt}
                        {showAnswer && <span className="ml-auto text-xs font-bold">correct</span>}
                      </button>
                    );
                  })}
                </div>
                {result && ci < 0 && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    ⚠ This question has no valid correct answer set — it would always score wrong. Fix the JSON.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-line p-4">
          {result ? (
            <div className="flex items-center justify-between">
              <p className="text-sm">
                Would score <span className="font-display text-2xl font-bold text-ink">{result.grade}%</span>
                <span className="ml-2 text-ink/50">({result.correct}/{result.total} correct)</span>
              </p>
              <button className="btn-ghost" onClick={() => { setResult(null); setPicked({}); }}>Try again</button>
            </div>
          ) : (
            <button className="btn-gold w-full" onClick={grade}
              disabled={Object.keys(picked).length !== questions.length}>
              {Object.keys(picked).length !== questions.length
                ? `Answer all ${questions.length} to check score`
                : "Check the score"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
