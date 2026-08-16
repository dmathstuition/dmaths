"use client";
import { useEffect, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { Icon } from "@/components/Icons";

type Q = { id: string; question: string; code: string; options: string[] };
type Info = {
  boss: { name: string; questionCount: number; passPct: number; reward: number } | null;
  attempt: { score: number; total: number; passed: boolean; points: number } | null;
  error?: string;
};
type Result = { correct: number; total: number; percent: number; passed: boolean; points: number; newTotal?: number; passPct: number };
type Phase = "idle" | "play" | "over";

export default function BossBattleClient() {
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [passPct, setPassPct] = useState(70);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);

  async function load() {
    try {
      const r = await fetch("/api/boss", { cache: "no-store" });
      const j = await r.json();
      setInfo(j);
    } catch { setInfo({ boss: null, attempt: null, error: "Couldn't load the Boss." }); }
  }
  useEffect(() => { load(); }, []);

  async function start() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/boss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't start the battle."); return; }
      if (j.done) { await load(); return; } // already attempted — refresh status
      setQuestions(j.questions ?? []); setPassPct(j.passPct ?? 70); setAnswers({}); setPhase("play");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true); setErr("");
    try {
      const responses = questions.map((q) => ({ id: q.id, chosen: answers[q.id] ?? -1 }));
      const r = await fetch("/api/boss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", responses }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't submit — try again."); return; }
      setResult(j); setPhase("over");
      if (j.passed) setCelebrate((c) => c + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally { setBusy(false); }
  }

  if (!info) return <div className="card p-6 text-sm text-ink/50">Loading this week's Boss…</div>;

  // ── No boss set this week ──
  if (!info.boss) {
    return (
      <div className="card p-8 text-center">
        <p className="flex justify-center text-ink/30"><Icon name="trophy" className="h-10 w-10" /></p>
        <h2 className="mt-2 font-display text-xl font-semibold text-ink">No Boss this week</h2>
        <p className="mt-1 text-sm text-ink/55">{info.error || "Your tutor hasn't set one yet — check back soon."}</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={70} /></div>

      {/* ── Result screen ── */}
      {phase === "over" && result && (
        <div className="relative overflow-hidden rounded-3xl p-8 text-center text-white shadow-lift"
          style={{ background: result.passed ? "linear-gradient(135deg,#1f7a4d 0%,#0f5132 100%)" : "linear-gradient(135deg,#8a1c2b 0%,#5a0f18 100%)" }}>
          <p className="flex justify-center text-gold">{result.passed ? <Icon name="partyPopper" className="h-12 w-12" /> : <Icon name="trophy" className="h-12 w-12" />}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{result.passed ? "Boss defeated!" : "The Boss stands"}</h2>
          <p className="mt-3 font-display text-6xl font-extrabold text-gold">{result.percent}%</p>
          <p className="text-sm text-white/70">{result.correct}/{result.total} correct · pass mark {result.passPct}%</p>
          {result.passed
            ? <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 font-extrabold text-board"><Icon name="zap" className="h-4 w-4" /> +{result.points} reward points</p>
            : <p className="mt-4 text-sm text-white/70">No reward this time — one attempt per week. Come back for next week's Boss.</p>}
        </div>
      )}

      {/* ── Battle in progress ── */}
      {phase === "play" && (
        <div className="space-y-4">
          <div className="sticky top-2 z-10 flex items-center justify-between rounded-2xl border border-gold/30 bg-gold-pale/90 px-4 py-3 backdrop-blur">
            <span className="text-sm font-bold text-ink">⚔️ {info.boss.name}</span>
            <span className="text-sm font-bold text-ink/60">{answeredCount}/{questions.length} answered</span>
          </div>
          {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}
          {questions.map((q, i) => (
            <div key={q.id} className="card p-5">
              <p className="font-semibold text-ink"><span className="text-ink/40">{i + 1}.</span> {q.question}</p>
              {q.code && <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0b2036] p-3 font-mono text-[12px] text-slate-100">{q.code}</pre>}
              <div className="mt-3 space-y-2">
                {q.options.map((o, j) => (
                  <button key={j} onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                      answers[q.id] === j ? "border-gold bg-gold-pale font-bold text-ink" : "border-line bg-white text-ink/70 hover:border-gold/40"}`}>
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${answers[q.id] === j ? "border-gold bg-gold text-board" : "border-line text-ink/40"}`}>{String.fromCharCode(65 + j)}</span>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submit} disabled={busy} className="btn-gold w-full !rounded-2xl !py-4 text-base">
            {busy ? "Submitting…" : answeredCount < questions.length ? `Submit — ${questions.length - answeredCount} unanswered` : "Submit my answers"}
          </button>
        </div>
      )}

      {/* ── Idle / briefing ── */}
      {phase === "idle" && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-line bg-chalk/50 p-6">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-board text-gold"><Icon name="trophy" className="h-7 w-7" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-gold-deep">This week's Boss</p>
              <h2 className="font-display text-2xl font-bold text-ink">{info.boss.name}</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
            <div className="p-4"><p className="font-display text-2xl font-extrabold text-ink">{Math.min(info.boss.questionCount, 25)}</p><p className="text-xs text-ink/50">questions</p></div>
            <div className="p-4"><p className="font-display text-2xl font-extrabold text-ink">{info.boss.passPct}%</p><p className="text-xs text-ink/50">to defeat it</p></div>
            <div className="p-4"><p className="font-display text-2xl font-extrabold text-gold-deep">+{info.boss.reward}</p><p className="text-xs text-ink/50">reward points</p></div>
          </div>
          <div className="p-6">
            {info.attempt ? (
              <div className={`flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4 ${info.attempt.passed ? "bg-emerald-50" : "bg-chalk"}`}>
                <Icon name={info.attempt.passed ? "checkCircle" : "clock"} className={`h-6 w-6 ${info.attempt.passed ? "text-emerald-600" : "text-ink/40"}`} />
                <div>
                  <p className="font-bold text-ink">{info.attempt.passed ? "You defeated this Boss!" : "You've faced this week's Boss"}</p>
                  <p className="text-sm text-ink/55">Scored {info.attempt.score}/{info.attempt.total}{info.attempt.passed ? ` · earned ${info.attempt.points} points` : " — try again next week"}.</p>
                </div>
              </div>
            ) : info.boss.questionCount === 0 ? (
              <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">The Boss has no questions yet — check back once your tutor adds them.</p>
            ) : (
              <>
                {err && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}
                <p className="mb-4 text-sm text-ink/60">You get <strong>one attempt</strong>. Take your time — there's no timer, but you can't retry until next week's Boss.</p>
                <button onClick={start} disabled={busy} className="btn-gold !rounded-2xl !px-8 !py-3.5 text-base">
                  <span className="inline-flex items-center gap-2">{busy ? "Entering…" : "Face the Boss"} <Icon name="zap" className="h-4 w-4" /></span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
