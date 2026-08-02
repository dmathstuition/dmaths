"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";

type Solution = { steps: string[]; answer: string; topic?: string };

const EXAMPLES = [
  "Solve 3x + 5 = 20",
  "Find the area of a circle with radius 7 cm",
  "Simplify 2/3 + 5/6",
  "Factorise x² + 7x + 12",
];

export default function SolveClient() {
  const [problem, setProblem] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sol, setSol] = useState<Solution | null>(null);

  async function solve(text?: string) {
    const q = (text ?? problem).trim();
    if (q.length < 3) { setErr("Type or paste a question first."); return; }
    if (text) setProblem(text);
    setErr(""); setBusy(true); setSol(null);
    try {
      const r = await fetch("/api/ai/solve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: q, subject }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't solve that — try again."); return; }
      setSol({ steps: j.steps ?? [], answer: j.answer ?? "", topic: j.topic });
    } catch {
      setErr("Couldn't reach the A.I — please try again.");
    } finally { setBusy(false); }
  }

  function reset() { setSol(null); setProblem(""); setErr(""); }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* hero */}
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="lightbulb" className="h-6 w-6" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25"><Icon name="sigma" className="h-6 w-6" /></span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Question solver</h1>
          <p className="mt-1 text-sm text-white/50">Paste or type any question — the A.I walks you through it, step by step.</p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* input */}
      <div className="card space-y-4 p-6">
        <label className="block">
          <span className="flabel">Your question</span>
          <textarea value={problem} onChange={(e) => setProblem(e.target.value)} rows={4}
            placeholder="e.g. A trader sells 12 oranges for ₦600. How much are 5 oranges?"
            className="field resize-y" />
        </label>
        <label className="block">
          <span className="flabel">Subject (optional)</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="Maths, Physics, Chemistry…" className="field" />
        </label>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => solve(ex)} disabled={busy}
              className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink/60 transition hover:bg-chalk disabled:opacity-50">
              {ex}
            </button>
          ))}
        </div>

        <button onClick={() => solve()} disabled={busy || problem.trim().length < 3} className="btn-gold w-full !rounded-xl disabled:opacity-50">
          {busy ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-board border-t-transparent" /> Solving…</span>
                : <span className="inline-flex items-center gap-1.5">Solve it <Icon name="sparkles" className="h-4 w-4" /></span>}
        </button>
        <p className="text-center text-[12px] text-ink/40">Follow the steps and try the next one yourself — that&apos;s how it sticks. 💪</p>
      </div>

      {/* solution */}
      {sol && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
              <Icon name="compass" className="h-5 w-5 text-gold-deep" /> Step by step
            </h2>
            {sol.topic && <span className="rounded-full bg-gold-pale px-2.5 py-0.5 text-[11px] font-bold text-gold-deep">{sol.topic}</span>}
          </div>

          <ol className="space-y-3">
            {sol.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gold text-[12px] font-extrabold text-board">{i + 1}</span>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink/80">{s}</p>
              </li>
            ))}
          </ol>

          {sol.answer && (
            <div className="rounded-2xl bg-board p-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gold/70">Answer</p>
              <p className="mt-0.5 font-display text-xl font-extrabold text-gold">{sol.answer}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={reset} className="btn-gold !rounded-xl">
              <span className="inline-flex items-center gap-1.5">New question <Icon name="repeat" className="h-4 w-4" /></span>
            </button>
            <a href="/portal/assistant" className="btn-ghost !rounded-xl">Ask D-Maths A.I</a>
            <a href="/portal/practice" className="btn-ghost !rounded-xl">Practice</a>
          </div>
          <p className="text-[11px] text-ink/40">A.I can slip up — check the working, and ask your tutor if a step doesn&apos;t look right.</p>
        </div>
      )}
    </div>
  );
}
