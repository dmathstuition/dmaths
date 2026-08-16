"use client";
import { useCallback, useEffect, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { Icon } from "@/components/Icons";
import { DUEL_REWARD } from "@/lib/duel";

type Q = { id: string; question: string; code?: string; image_url?: string; options: string[] };
type MyDuel = { code: string; subject: string; status: string; iAmCreator: boolean; myScore: number | null; theirScore: number | null; opponentName: string; result: string | null; played: boolean };
type Phase = "lobby" | "play" | "waiting" | "result";

export default function DuelClient() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [code, setCode] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<MyDuel[]>([]);
  const [result, setResult] = useState<{ result: string; correct: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);

  const loadMine = useCallback(async () => {
    try { const r = await fetch("/api/duel", { cache: "no-store" }); const j = await r.json(); if (Array.isArray(j.duels)) setMine(j.duels); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/practice"); const j = await r.json(); setSubjects(j.subjects ?? []); } catch { /* ignore */ }
    })();
    loadMine();
  }, [loadMine]);

  // Poll for the opponent's result while waiting.
  useEffect(() => {
    if (phase !== "waiting" || !code) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/duel?code=${code}`, { cache: "no-store" });
        const j = await r.json();
        if (j.duel?.result) { setResult({ result: j.duel.result, correct: j.duel.myScore ?? 0 }); setPhase("result"); if (j.duel.result === "won") setCelebrate((c) => c + 1); }
      } catch { /* keep waiting */ }
    }, 5000);
    return () => clearInterval(t);
  }, [phase, code]);

  async function act(payload: any) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/duel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Something went wrong."); return null; }
      return j;
    } catch { setErr("Couldn't reach the server."); return null; }
    finally { setBusy(false); }
  }

  async function create() {
    const j = await act({ action: "create", subject, count: 5 });
    if (!j) return;
    setCode(j.code); setQuestions(j.questions ?? []); setAnswers({}); setResult(null); setPhase("play");
  }
  async function join() {
    if (!joinCode.trim()) { setErr("Enter a duel code."); return; }
    const j = await act({ action: "join", code: joinCode });
    if (!j) return;
    setCode(j.code); setQuestions(j.questions ?? []); setAnswers({}); setResult(null); setPhase("play");
  }
  async function submit() {
    const responses = questions.map((q) => ({ id: q.id, chosen: answers[q.id] ?? -1 }));
    const j = await act({ action: "submit", code, responses });
    if (!j) return;
    if (j.resolved) { setResult({ result: j.result, correct: j.correct }); setPhase("result"); if (j.result === "won") setCelebrate((c) => c + 1); }
    else { setPhase("waiting"); }
    loadMine();
  }
  function reset() { setPhase("lobby"); setCode(""); setQuestions([]); setAnswers({}); setResult(null); setErr(""); loadMine(); }

  const answered = Object.keys(answers).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={70} /></div>
      {err && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {phase === "lobby" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><Icon name="zap" className="h-5 w-5 text-gold-deep" /> Start a duel</h2>
              <p className="mt-1 text-sm text-ink/55">Play 5 questions, then share the code. Winner takes {DUEL_REWARD} points.</p>
              <label className="mt-3 block"><span className="flabel">Subject</span>
                <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">Any subject</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button onClick={create} disabled={busy} className="btn-gold mt-4 w-full !rounded-xl">Create duel</button>
            </div>
            <div className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink"><Icon name="students" className="h-5 w-5 text-gold-deep" /> Join a duel</h2>
              <p className="mt-1 text-sm text-ink/55">Got a code from a friend? Enter it to play the same questions.</p>
              <input className="field mt-3 text-center font-display text-xl font-bold uppercase tracking-widest" maxLength={6}
                value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" />
              <button onClick={join} disabled={busy} className="btn-ink mt-4 w-full !rounded-xl">Join</button>
            </div>
          </div>

          {mine.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-display text-base font-semibold text-ink">Your duels</h3>
              <ul className="divide-y divide-line/60">
                {mine.map((d) => (
                  <li key={d.code} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="font-mono font-bold tracking-wider text-ink/70">{d.code}</span>
                    <span className="min-w-0 flex-1 truncate text-ink/55">{d.subject || "Any"} · {d.opponentName || "waiting for opponent"}</span>
                    {d.result
                      ? <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${d.result === "won" ? "bg-emerald-50 text-emerald-700" : d.result === "lost" ? "bg-red-50 text-red-600" : "bg-chalk text-ink/50"}`}>{d.result === "won" ? `Won ${d.myScore}–${d.theirScore}` : d.result === "lost" ? `Lost ${d.myScore}–${d.theirScore}` : "Draw"}</span>
                      : <span className="rounded-full bg-gold-pale px-2.5 py-0.5 text-[11px] font-bold text-gold-deep">{d.played ? "Waiting" : "Your turn"}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {phase === "play" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-board px-4 py-3 text-white">
            <span className="font-bold">⚔️ Duel · <span className="font-mono tracking-wider text-gold">{code}</span></span>
            <span className="text-sm text-white/60">{answered}/{questions.length} answered</span>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} className="card p-5">
              <p className="font-semibold text-ink"><span className="text-ink/40">{i + 1}.</span> {q.question}</p>
              {q.image_url && <img src={q.image_url} alt="Question figure" className="mt-2 max-h-64 rounded-xl border border-line" />}
              {q.code && <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0b2036] p-3 font-mono text-[12px] text-slate-100">{q.code}</pre>}
              <div className="mt-3 space-y-2">
                {q.options.map((o, j) => (
                  <button key={j} onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition ${answers[q.id] === j ? "border-gold bg-gold-pale font-bold text-ink" : "border-line bg-white text-ink/70 hover:border-gold/40"}`}>
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${answers[q.id] === j ? "border-gold bg-gold text-board" : "border-line text-ink/40"}`}>{"ABCDEF"[j]}</span>{o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submit} disabled={busy} className="btn-gold w-full !rounded-2xl !py-4">{busy ? "Submitting…" : "Submit my answers"}</button>
        </div>
      )}

      {phase === "waiting" && (
        <div className="card p-8 text-center">
          <p className="flex justify-center text-gold"><Icon name="clock" className="h-10 w-10" /></p>
          <h2 className="mt-2 font-display text-xl font-bold text-ink">Answers locked in!</h2>
          <p className="mt-1 text-sm text-ink/60">Share this code with a friend to challenge them:</p>
          <p className="my-3 font-display text-4xl font-extrabold tracking-[0.3em] text-gold-deep">{code}</p>
          <p className="text-sm text-ink/50">This page will update the moment they finish. You can leave and check back on “Your duels”.</p>
          <button onClick={reset} className="btn-ghost mt-4 !rounded-xl">Back to lobby</button>
        </div>
      )}

      {phase === "result" && result && (
        <div className="card p-8 text-center">
          <p className="flex justify-center text-gold">{result.result === "won" ? <Icon name="partyPopper" className="h-12 w-12" /> : <Icon name="trophy" className="h-12 w-12" />}</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink">{result.result === "won" ? "You won! 🎉" : result.result === "lost" ? "You lost" : "It's a draw"}</h2>
          <p className="mt-1 text-sm text-ink/60">You scored {result.correct} out of {questions.length || "—"}.{result.result === "won" ? ` +${DUEL_REWARD} reward points!` : ""}</p>
          <button onClick={reset} className="btn-gold mt-5 !rounded-xl !px-8">Play another</button>
        </div>
      )}
    </div>
  );
}
