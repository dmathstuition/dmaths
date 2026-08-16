"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import Confetti from "@/components/ui/Confetti";
import CountUp from "@/components/landing/CountUp";
import { PRACTICE_COUNTS } from "@/lib/practice";
import {
  saveRound, listSavedRounds, deleteRound, queueResult, drainQueue,
  type SavedRound, type QueuedResult,
} from "@/lib/offlinePractice";

type Q = { id: string; question: string; code?: string; image_url?: string; options: string[] };
type WeakTopic = { subject: string; topic: string; accuracy: number; total: number };
type Meta = { subjects: string[]; levels: string[]; total: number; weak?: WeakTopic[] };
type Result = { id: string; correct: boolean; answer: number; chosen: number };
type Phase = "setup" | "loading" | "quiz" | "result";

export default function PracticeClient({ mySubjects, myLevel }: { mySubjects: string[]; myLevel: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [count, setCount] = useState<number>(10);

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [err, setErr] = useState("");

  const [score, setScore] = useState<{ correct: number; total: number; points: number; capReached: boolean; results: Result[] } | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [recMode, setRecMode] = useState(false);
  const [explains, setExplains] = useState<Record<string, string>>({});
  const [explaining, setExplaining] = useState<string | null>(null);

  // ── Offline practice ──
  const [offline, setOffline] = useState(false);
  const [saved, setSaved] = useState<SavedRound[]>([]);
  const [pending, setPending] = useState(0);
  const [savingOffline, setSavingOffline] = useState(false);
  const [offlineRoundId, setOfflineRoundId] = useState<string | null>(null);
  const [queuedDone, setQueuedDone] = useState(false);

  const refreshOffline = useCallback(async () => {
    setSaved(await listSavedRounds());
    setPending((await (await import("@/lib/offlinePractice")).pendingResults()).length);
  }, []);

  // Sync any rounds played offline back to the server for grading + reward.
  const sync = useCallback(async () => {
    const { synced, points } = await drainQueue(async (r: QueuedResult) => {
      try {
        const res = await fetch("/api/practice", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses: r.responses, subject: r.subject, level: r.level }),
        });
        if (!res.ok) return { ok: false };
        const j = await res.json().catch(() => ({}));
        return { ok: true, points: Number(j.points || 0) };
      } catch { return { ok: false }; }
    });
    await refreshOffline();
    if (synced > 0) setErr(`Synced ${synced} offline round${synced === 1 ? "" : "s"}${points > 0 ? ` · +${points} points` : ""}.`);
  }, [refreshOffline]);

  useEffect(() => {
    setOffline(!navigator.onLine);
    refreshOffline();
    if (navigator.onLine) sync();
    const goOnline = () => { setOffline(false); sync(); };
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [refreshOffline, sync]);

  // Download the current filter's round for offline play (answers never cached —
  // grading happens on sync, so reward stays server-authoritative).
  async function saveForOffline() {
    setSavingOffline(true); setErr("");
    try {
      const qs = new URLSearchParams({ count: String(count) });
      if (subject) qs.set("subject", subject);
      if (level) qs.set("level", level);
      const r = await fetch(`/api/practice?${qs}`);
      const j = await r.json();
      if (!j.questions?.length) { setErr("No questions to save for that filter."); return; }
      const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      await saveRound({ id, questions: j.questions, subject, level, savedAt: Date.now() });
      await refreshOffline();
    } finally { setSavingOffline(false); }
  }

  function startSavedRound(round: SavedRound) {
    setErr(""); setRecMode(false);
    setOfflineRoundId(round.id); setSubject(round.subject); setLevel(round.level);
    setQuestions(round.questions); setPicks({}); setIdx(0); setScore(null); setQueuedDone(false);
    setPhase("quiz");
  }

  async function explain(r: Result, q: Q) {
    if (explains[q.id] || explaining) return;
    setExplaining(q.id);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.question, options: q.options, answer: r.answer, chosen: r.chosen, subject }),
      });
      const j = await res.json();
      setExplains((e) => ({ ...e, [q.id]: res.ok ? j.explanation : (j.error || "Couldn't explain right now.") }));
    } catch {
      setExplains((e) => ({ ...e, [q.id]: "Couldn't explain right now — try again." }));
    } finally {
      setExplaining(null);
    }
  }

  // Load the filter options once; default the subject to one the learner takes.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/practice");
        const j = await r.json();
        setMeta(j);
        const mine = (mySubjects || []).find((s) => (j.subjects || []).includes(s));
        if (mine) setSubject(mine);
        if ((j.levels || []).includes(myLevel)) setLevel(myLevel);
      } catch { setMeta({ subjects: [], levels: [], total: 0 }); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start(recommend = false) {
    setErr(""); setPhase("loading");
    const qs = new URLSearchParams({ count: String(count) });
    if (recommend) qs.set("recommend", "1");
    else { if (subject) qs.set("subject", subject); if (level) qs.set("level", level); }
    try {
      const r = await fetch(`/api/practice?${qs}`);
      const j = await r.json();
      if (recommend && j.needMore) { setErr("Do a few practice rounds first so we can spot your weak topics."); setPhase("setup"); return; }
      if (recommend && j.needQuestions) { setErr("No questions yet for your weak topics — try a normal round."); setPhase("setup"); return; }
      if (!j.questions?.length) { setErr("No questions match that filter yet — try 'Any'."); setPhase("setup"); return; }
      setRecMode(recommend);
      setQuestions(j.questions); setPicks({}); setIdx(0); setScore(null); setPhase("quiz");
    } catch { setErr("Couldn't start — please try again."); setPhase("setup"); }
  }

  const cur = questions[idx];
  const chosen = cur ? picks[cur.id] : undefined;
  const isLast = idx === questions.length - 1;

  function choose(i: number) { if (cur) setPicks((p) => ({ ...p, [cur.id]: i })); }

  async function next() {
    if (chosen === undefined) return;
    if (!isLast) { setIdx((i) => i + 1); return; }
    const responses = questions.map((q) => ({ id: q.id, chosen: picks[q.id] ?? -1 }));

    // Offline: queue the answers to grade + reward on reconnect (no key on device).
    if (offlineRoundId && !navigator.onLine) {
      await queueResult({ id: offlineRoundId, responses, subject, level, at: Date.now() });
      await deleteRound(offlineRoundId);
      setOfflineRoundId(null); setQueuedDone(true); setPhase("result");
      refreshOffline();
      return;
    }

    // submit
    setPhase("loading");
    try {
      const r = await fetch("/api/practice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, subject: recMode ? "" : subject, level: recMode ? "" : level }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't grade — please try again."); setPhase("quiz"); return; }
      setScore(j);
      setPhase("result");
      if (j.total && j.correct / j.total >= 0.7) setCelebrate((c) => c + 1);
      // A saved round played back online is consumed once graded.
      if (offlineRoundId) { deleteRound(offlineRoundId); setOfflineRoundId(null); refreshOffline(); }
    } catch { setErr("Couldn't grade — please try again."); setPhase("quiz"); }
  }

  const pct = score && score.total ? Math.round((score.correct / score.total) * 100) : 0;
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={48} /></div>

      {/* hero */}
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="target" className="h-6 w-6" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25"><Icon name="assignments" className="h-6 w-6" /></span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Practice</h1>
          <p className="mt-1 text-sm text-white/50">Sharpen up and earn reward points — correct answers pay off.</p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {(offline || pending > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gold/40 bg-gold-pale/50 px-4 py-3 text-sm font-semibold text-ink/75">
          <Icon name={offline ? "download" : "repeat"} className="h-4 w-4 text-gold-deep" />
          {offline
            ? <span>You&apos;re offline — play a saved round below; your answers grade &amp; earn when you reconnect.</span>
            : <span>{pending} offline round{pending === 1 ? "" : "s"} waiting to sync.</span>}
        </div>
      )}

      {/* Saved offline rounds — playable with or without a connection. */}
      {phase === "setup" && saved.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-2 flex items-center gap-2 font-display text-base font-semibold text-ink">
            <Icon name="download" className="h-4 w-4 text-gold-deep" /> Saved for offline
          </h3>
          <ul className="space-y-2">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-chalk/60 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold text-ink/75">{r.subject || "Any subject"}{r.level ? ` · ${r.level}` : ""} · {r.questions.length} questions</span>
                <button onClick={() => startSavedRound(r)} className="btn-gold !min-h-[34px] !rounded-lg !px-4 !py-1.5 text-sm">Play</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Setup ─────────────────────────────────────────────── */}
      {phase === "setup" && (
        <div className="card space-y-5 p-6">
          {meta && meta.total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-ink/45">
              <Icon name="assignments" className="h-10 w-10 text-ink/30" />
              <p className="text-sm">No practice questions available yet — check back soon!</p>
            </div>
          ) : (
            <>
              {!!meta?.weak?.length && (
                <div className="rounded-2xl border border-gold/40 bg-gold-pale/50 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <Icon name="target" className="h-4 w-4 text-gold-deep" /> Recommended for you
                  </p>
                  <p className="mt-0.5 text-xs text-ink/55">A round on the topics you find hardest right now:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {meta.weak!.slice(0, 3).map((w) => (
                      <span key={`${w.subject}-${w.topic}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-bold text-ink/70">
                        {w.topic} <span className="text-red-500">{w.accuracy}%</span>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => start(true)} className="btn-gold mt-3 !rounded-xl !py-2.5">
                    <span className="inline-flex items-center gap-1.5">Practice these <Icon name="zap" className="h-4 w-4" /></span>
                  </button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="flabel">Subject</span>
                  <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="">Any subject</option>
                    {(meta?.subjects ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="flabel">Level</span>
                  <select className="field" value={level} onChange={(e) => setLevel(e.target.value)}>
                    <option value="">Any level</option>
                    {(meta?.levels ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <span className="flabel">How many questions?</span>
                <div className="flex gap-2">
                  {PRACTICE_COUNTS.map((n) => (
                    <button key={n} onClick={() => setCount(n)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${count === n ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/55 hover:bg-chalk"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => start(false)} disabled={!meta || offline} className="btn-gold w-full !rounded-xl disabled:opacity-50">
                <span className="inline-flex items-center gap-1.5">Start practice <Icon name="zap" className="h-4 w-4" /></span>
              </button>
              {!offline && (
                <button onClick={saveForOffline} disabled={savingOffline || !meta?.total} className="w-full rounded-xl border border-line py-2.5 text-sm font-bold text-ink/60 hover:bg-chalk disabled:opacity-50">
                  <span className="inline-flex items-center gap-1.5"><Icon name="download" className="h-4 w-4" /> {savingOffline ? "Saving…" : "Save a round for offline"}</span>
                </button>
              )}
              <p className="text-center text-xs text-ink/40">Correct answers earn reward points (up to a daily cap) — it counts toward your leaderboard total.</p>
            </>
          )}
        </div>
      )}

      {phase === "loading" && (
        <div className="card flex items-center justify-center gap-3 p-10 text-ink/50">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" /> Working…
        </div>
      )}

      {/* ── Quiz ──────────────────────────────────────────────── */}
      {phase === "quiz" && cur && (
        <div className="card p-6">
          <div className="mb-3 flex items-center justify-between text-sm font-bold text-ink/50">
            <span>Question {idx + 1} of {questions.length}</span>
            <span className="text-gold-deep">{Object.keys(picks).length}/{questions.length} answered</span>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-300" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
          </div>

          <p className="font-display text-lg font-bold text-ink">{cur.question}</p>
          {cur.image_url && <img src={cur.image_url} alt="Question figure" className="mt-3 max-h-72 rounded-xl border border-line" />}
          {cur.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-board p-4 text-sm text-gold-soft"><code>{cur.code}</code></pre>}

          <div className="mt-4 space-y-2.5">
            {cur.options.map((opt, i) => (
              <button key={i} onClick={() => choose(i)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  chosen === i ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/75 hover:bg-chalk"}`}>
                <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${chosen === i ? "bg-gold text-board" : "bg-ink/5 text-ink/50"}`}>{"ABCDEF"[i]}</span>
                <span className="min-w-0">{opt}</span>
              </button>
            ))}
          </div>

          <button onClick={next} disabled={chosen === undefined} className="btn-gold mt-6 w-full !rounded-xl disabled:opacity-50">
            {isLast ? "Finish & see score" : "Next question →"}
          </button>
        </div>
      )}

      {/* ── Result: played offline, queued for grading ── */}
      {phase === "result" && queuedDone && (
        <div className="card p-8 text-center">
          <p className="flex justify-center text-gold-deep"><Icon name="download" className="h-10 w-10" /></p>
          <h2 className="mt-2 font-display text-xl font-bold text-ink">Answers saved 📥</h2>
          <p className="mt-1 text-sm text-ink/60">You&apos;re offline, so this round will be graded and any reward points added as soon as you&apos;re back online.</p>
          <button onClick={() => { setQueuedDone(false); setPhase("setup"); }} className="btn-gold mt-5 !rounded-xl">Done</button>
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────── */}
      {phase === "result" && !queuedDone && score && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl p-7 text-center text-white"
            style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
            <p className="text-sm font-bold uppercase tracking-wider text-gold/70">Your score</p>
            <p className="font-display text-6xl font-extrabold text-gold"><CountUp to={pct} duration={900} />%</p>
            <p className="mt-1 text-sm text-white/60">{score.correct} of {score.total} correct</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-gold ring-1 ring-gold/25">
              <Icon name="coins" className="h-4 w-4" />
              {score.points > 0 ? `+${score.points} reward points` : score.capReached ? "Daily reward cap reached" : "No points this round"}
            </p>
          </div>

          {/* review */}
          <div className="card divide-y divide-line/60">
            {score.results.map((r, n) => {
              const q = byId.get(r.id);
              if (!q) return null;
              return (
                <div key={r.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white ${r.correct ? "bg-emerald-500" : "bg-red-500"}`}>
                      <Icon name={r.correct ? "checkCircle" : "close"} className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-bold text-ink">{n + 1}. {q.question}</p>
                  </div>
                  <div className="ml-7 mt-1.5 space-y-0.5 text-[13px]">
                    {!r.correct && r.chosen >= 0 && <p className="text-red-600">Your answer: {q.options[r.chosen]}</p>}
                    <p className="text-emerald-700">Correct: {q.options[r.answer]}</p>
                  </div>
                  <div className="ml-7 mt-2">
                    {explains[q.id] ? (
                      <div className="rounded-xl bg-board/[0.04] p-3 text-[13px] leading-relaxed text-ink/75 ring-1 ring-line dark:bg-white/5">
                        <span className="mb-0.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold-deep"><Icon name="compass" className="h-3 w-3" /> D-Maths A.I</span>
                        <p>{explains[q.id]}</p>
                      </div>
                    ) : (
                      <button onClick={() => explain(r, q)} disabled={explaining === q.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-gold-deep transition hover:bg-gold-pale disabled:opacity-50 dark:bg-white/5">
                        <Icon name="compass" className="h-3.5 w-3.5" /> {explaining === q.id ? "Thinking…" : "Explain this"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setPhase("setup"); setErr(""); }} className="btn-gold !rounded-xl">
              <span className="inline-flex items-center gap-1.5">Practice again <Icon name="repeat" className="h-4 w-4" /></span>
            </button>
            <a href="/portal/leaderboard" className="btn-ghost !rounded-xl">View leaderboard</a>
            <a href="/portal/shop" className="btn-ghost !rounded-xl">Rewards shop</a>
          </div>
        </div>
      )}
    </div>
  );
}
