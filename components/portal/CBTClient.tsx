"use client";
import { useState, useEffect, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { Icon } from "@/components/Icons";

type Question = {
  id: number;
  question: string;
  code?: string;
  image_url?: string;
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
  const [result, setResult] = useState<{ grade: number; correct: number; total: number; points?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(() => {
    if (!cbtClose) return null;
    return Math.max(0, Math.floor((new Date(cbtClose).getTime() - Date.now()) / 1000));
  });
  // AI "Explain this" on the post-submission review (safe: already graded).
  const [explains, setExplains] = useState<Record<number, string>>({});
  const [explaining, setExplaining] = useState<number | null>(null);

  // ── Secure exam mode ──────────────────────────────────────────
  const MAX_LEAVES = 1; // one warning; leaving again ends the exam
  const [started, setStarted] = useState(false);
  const [violations, setViolations] = useState(0);
  const [warn, setWarn] = useState(false);
  const [terminated, setTerminated] = useState(false);

  async function explain(i: number, ques: Question, ci: number, picked: number | null) {
    if (explains[i] || explaining !== null) return;
    setExplaining(i);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: ques.question, options: ques.options, answer: ci, chosen: picked ?? -1, subject }),
      });
      const j = await res.json();
      setExplains((e) => ({ ...e, [i]: res.ok ? j.explanation : (j.error || "Couldn't explain right now.") }));
    } catch {
      setExplains((e) => ({ ...e, [i]: "Couldn't explain right now — try again." }));
    } finally {
      setExplaining(null);
    }
  }

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const hasAutoSubmitted = useRef(false);
  const startedRef = useRef(false); startedRef.current = started;
  const submittedRef = useRef(false); submittedRef.current = submitted;
  const terminatedRef = useRef(false); terminatedRef.current = terminated;
  const violationsRef = useRef(0); violationsRef.current = violations;
  const leaveLock = useRef(0);

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

  // ── Secure exam: fullscreen + leave detection ─────────────────
  async function enterFullscreen() {
    try { await (document.documentElement.requestFullscreen?.() ?? Promise.resolve()); }
    catch { /* fullscreen may be blocked; the visibility/blur guards still apply */ }
  }
  async function startExam() { await enterFullscreen(); setStarted(true); }
  async function resumeExam() { setWarn(false); await enterFullscreen(); }

  // Leave the fullscreen shell once the exam is over.
  useEffect(() => {
    if (submitted && typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [submitted]);

  // Register a "left the exam" event: warn the first time, auto-submit the next.
  useEffect(() => {
    if (!started || submitted) return;
    const registerLeave = () => {
      if (submittedRef.current || terminatedRef.current) return;
      const now = Date.now();
      if (now - leaveLock.current < 800) return; // debounce paired events (blur+visibility)
      leaveLock.current = now;
      const next = violationsRef.current + 1;
      setViolations(next);
      if (next > MAX_LEAVES) { setTerminated(true); doSubmit(); }
      else setWarn(true);
    };
    const onVis = () => { if (document.hidden) registerLeave(); };
    const onFs = () => { if (!document.fullscreenElement) registerLeave(); };
    const block = (e: Event) => e.preventDefault();
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", registerLeave);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("selectstart", block);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", registerLeave);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("selectstart", block);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  if (submitted && result) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="boardgrid rounded-2xl bg-board p-8 text-center text-white">
          <p className="text-sm uppercase tracking-wider text-white/40">Your score</p>
          <p className="mt-2 font-display text-6xl font-bold">{result.grade}%</p>
          <p className="mt-2 text-white/60">{result.correct} out of {result.total} correct</p>
          {(result.points ?? 0) > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-gold ring-1 ring-gold/25">
              <Icon name="coins" className="h-4 w-4" /> +{result.points} reward points
            </p>
          )}
        </div>
        {terminated && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            ⚠️ Your exam was submitted automatically because you left the secure screen more than once.
          </p>
        )}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Review answers</h2>
          {questions.map((q, i) => {
            const picked = answers[i] ?? null;
            const ci = (typeof q.answer === "number" ? q.answer : q.correctAnswer);
            const isCorrect = picked === ci;
            return (
              <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-sm font-bold">{i + 1}. {q.question}</p>
                {q.image_url && <img src={q.image_url} alt="Question figure" className="mt-2 max-h-48 rounded-lg border border-line" />}
                {q.code && <pre className="mt-2 overflow-x-auto rounded-lg bg-chalk p-3 font-mono text-[11px] whitespace-pre-wrap text-ink/70">{q.code}</pre>}
                <div className="mt-2 space-y-1">
                  {q.options.map((opt, j) => (
                    <p key={j} className={`text-sm pl-4 ${j === ci ? "font-bold text-emerald-700" : j === picked && !isCorrect ? "font-bold text-red-600 line-through" : "text-ink/60"}`}>
                      {j === ci ? "✓ " : j === picked ? "✕ " : "  "}{opt}
                    </p>
                  ))}
                </div>
                {typeof ci === "number" && (
                  <div className="mt-2.5">
                    {explains[i] ? (
                      <div className="rounded-lg bg-white/70 p-2.5 text-[13px] leading-relaxed text-ink/75 ring-1 ring-black/5">
                        <span className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold-deep"><Icon name="compass" className="h-3 w-3" /> D-Maths A.I</span>
                        <p>{explains[i]}</p>
                      </div>
                    ) : (
                      <button onClick={() => explain(i, q, ci, picked)} disabled={explaining === i}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-gold-deep transition hover:bg-gold-pale disabled:opacity-50">
                        <Icon name="compass" className="h-3.5 w-3.5" /> {explaining === i ? "Thinking…" : "Explain this"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <a href="/portal/assignments" className="btn-gold block w-full text-center">← Back to assignments</a>
      </div>
    );
  }

  // ── Secure-start gate: read the rules, then enter fullscreen ──
  if (!started) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="boardgrid rounded-2xl bg-board p-7 text-white">
          <p className="pill-gold mb-2">{subject}</p>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">{assignmentTitle}</h1>
          <p className="mt-1 text-sm text-white/50">{total} question{total === 1 ? "" : "s"}{secsLeft !== null ? ` · ${fmtTime(secsLeft)} remaining` : ""}</p>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><Icon name="lock" className="h-5 w-5 text-gold-deep" /> Secure exam mode</h2>
          <p className="mt-1 text-sm text-ink/55">Please read carefully — this is a monitored test.</p>
          <ul className="mt-4 space-y-2.5 text-sm text-ink/75">
            {[
              "The exam opens in full screen — stay in it until you submit.",
              "Do not switch tabs, minimise, or leave this window.",
              "You get ONE warning. Leaving again submits your exam automatically.",
              "Copying, right-click and text selection are turned off.",
              "When the timer reaches 0, your answers are submitted for you.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold-pale text-gold-deep"><Icon name="checkCircle" className="h-3.5 w-3.5" /></span>{t}
              </li>
            ))}
          </ul>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-900">{error}</p>}
          <button onClick={startExam} className="btn-gold mt-6 w-full !rounded-xl">
            <span className="inline-flex items-center gap-1.5"><Icon name="lock" className="h-4 w-4" /> Start secure exam</span>
          </button>
        </div>
      </div>
    );
  }

  const urgent = secsLeft !== null && secsLeft < 300;

  return (
    <div className="mx-auto max-w-2xl space-y-5 select-none">
      {/* Header */}
      <div className="boardgrid rounded-2xl bg-board p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <p className="pill-gold mb-2">{subject}</p>
          {secsLeft !== null && (
            <span className={`inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums ${urgent ? "animate-pulse text-red-300" : "text-white/60"}`}>
              {urgent && <Icon name="clock" className="h-3.5 w-3.5" />}{fmtTime(secsLeft)}
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
        {q.image_url && <img src={q.image_url} alt="Question figure" className="mt-3 max-h-72 rounded-xl border border-line" />}
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

      {/* Secure-mode warning — shown the first time the learner leaves the screen */}
      {warn && !submitted && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-red-950/70 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600"><Icon name="alertTriangle" className="h-7 w-7" /></span>
            <h2 className="mt-4 font-display text-lg font-bold text-ink">Stay in the exam</h2>
            <p className="mt-2 text-sm text-ink/60">
              Leaving the exam screen isn&apos;t allowed. This is your <span className="font-bold text-red-600">only warning</span> — if you leave again, your exam will be submitted automatically.
            </p>
            <button onClick={resumeExam} className="btn-gold mt-6 w-full !rounded-xl">Return to exam</button>
          </div>
        </div>
      )}
    </div>
  );
}
