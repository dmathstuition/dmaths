"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import Confetti from "@/components/ui/Confetti";
import CountUp from "@/components/landing/CountUp";
import { EXAM_PRESETS } from "@/lib/mockExam";
import { reqStatusMeta } from "@/lib/mockRequests";

type Q = { id: string; question: string; code?: string; options: string[] };
type Meta = { subjects: string[]; levels: string[]; total: number };
type Req = { id: string; subject: string; preset: string; level: string; status: string; scheduled_for: string | null; startable: boolean; created_at: string };
type Hist = { id: string; preset: string; subject: string; correct: number; total: number; percent: number; band: string; created_at: string };
type Result = { id: string; correct: boolean; answer: number; chosen: number };
type Band = { grade: string; label: string; pass: boolean };
type Topic = { topic: string; correct: number; total: number; pct: number };
type Score = { correct: number; total: number; percent: number; band: Band; topics: Topic[]; results: Result[]; points: number };
type Phase = "setup" | "loading" | "exam" | "result";

function mmss(s: number) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function MockExamClient({ mySubjects, myLevel }: { mySubjects: string[]; myLevel: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [history, setHistory] = useState<Hist[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMsg, setReqMsg] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState(myLevel);
  const [preset, setPreset] = useState("quick");

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [err, setErr] = useState("");

  const [score, setScore] = useState<Score | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [explains, setExplains] = useState<Record<string, string>>({});
  const [explaining, setExplaining] = useState<string | null>(null);

  // Refs so the countdown can auto-submit with the latest answers without
  // re-arming the interval on every keystroke.
  const picksRef = useRef(picks); picksRef.current = picks;
  const questionsRef = useRef(questions); questionsRef.current = questions;
  const submittingRef = useRef(false);

  async function loadRequests() {
    try {
      const r = await fetch("/api/mock-requests", { cache: "no-store" });
      const j = await r.json();
      setRequests(j.requests ?? []);
    } catch { /* keep */ }
  }

  // Load filter options + recent history + the learner's requests once.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mock-exam", { cache: "no-store" });
        const j = await r.json();
        setMeta(j); setHistory(j.history ?? []);
        const mine = (mySubjects || []).find((s) => (j.subjects || []).includes(s));
        if (mine) setSubject(mine);
      } catch { setMeta({ subjects: [], levels: [], total: 0 }); }
      loadRequests();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function requestExam() {
    setReqBusy(true); setReqMsg(""); setErr("");
    try {
      const r = await fetch("/api/mock-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", subject, preset }),
      });
      const j = await r.json();
      if (!r.ok) { setReqMsg(j.error || "Couldn't send your request — try again."); return; }
      setReqMsg("Request sent — your tutor will approve it shortly. 🎓");
      loadRequests();
    } catch { setReqMsg("Couldn't send your request — try again."); }
    finally { setReqBusy(false); }
  }

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("loading");
    const responses = questionsRef.current.map((q) => ({ id: q.id, chosen: picksRef.current[q.id] ?? -1 }));
    try {
      const r = await fetch("/api/mock-exam", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, preset, subject, level }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't grade — please try again."); setPhase("exam"); submittingRef.current = false; return; }
      setScore(j); setPhase("result");
      if (j.band?.pass) setCelebrate((c) => c + 1);
    } catch {
      setErr("Couldn't grade — please try again."); setPhase("exam"); submittingRef.current = false;
    }
  }, [preset, subject, level]);

  // The exam clock. Ticks once a second while sitting; auto-submits at zero.
  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(t); submit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, submit]);

  async function start(req: Req) {
    setErr(""); setPhase("loading");
    // Grade-time submit reads these — align them to the approved request.
    setPreset(req.preset); setSubject(req.subject); setLevel(req.level);
    try {
      const r = await fetch(`/api/mock-exam?requestId=${encodeURIComponent(req.id)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "This mock isn't open yet."); setPhase("setup"); loadRequests(); return; }
      if (!j.questions?.length) { setErr("No questions for your class yet — ask your tutor."); setPhase("setup"); loadRequests(); return; }
      submittingRef.current = false;
      setQuestions(j.questions); setPicks({}); setIdx(0); setScore(null);
      setExplains({});
      setSecondsLeft((j.minutes ?? 20) * 60);
      setPhase("exam");
    } catch { setErr("Couldn't start — please try again."); setPhase("setup"); }
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
    } finally { setExplaining(null); }
  }

  const cur = questions[idx];
  const answered = Object.keys(picks).length;
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  function choose(i: number) { if (cur) setPicks((p) => ({ ...p, [cur.id]: i })); }

  function trySubmit() {
    const left = questions.length - answered;
    if (left > 0 && !confirm(`${left} question${left === 1 ? "" : "s"} still unanswered. Submit anyway?`)) return;
    submit();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={60} /></div>

      {/* hero */}
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="clock" className="h-6 w-6" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25"><Icon name="graduationCap" className="h-6 w-6" /></span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mock Exam</h1>
          <p className="mt-1 text-sm text-white/50">Sit a timed, exam-style paper and see your grade — WAEC & JAMB flavours.</p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* ── Setup ─────────────────────────────────────────────── */}
      {phase === "setup" && (
        <div className="card space-y-5 p-6">
          {meta && meta.total === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-ink/45">
              <Icon name="graduationCap" className="h-10 w-10 text-ink/30" />
              <p className="text-sm">No exam questions available yet — check back soon!</p>
            </div>
          ) : (
            <>
              <div>
                <span className="flabel">Choose a paper</span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {EXAM_PRESETS.map((p) => {
                    const on = preset === p.key;
                    return (
                      <button key={p.key} onClick={() => setPreset(p.key)}
                        className={`rounded-2xl border p-4 text-left transition ${on ? "border-gold bg-gold-pale" : "border-line bg-white hover:bg-chalk"}`}>
                        <p className={`font-display text-base font-bold ${on ? "text-gold-deep" : "text-ink"}`}>{p.label}</p>
                        <p className="mt-0.5 text-[12px] text-ink/50">{p.blurb}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-ink/45">
                          <Icon name="assignments" className="h-3 w-3" /> {p.count} Q
                          <span className="mx-1 text-ink/25">·</span>
                          <Icon name="clock" className="h-3 w-3" /> {p.minutes} min
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="flabel">Subject</span>
                  <select className="field" value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option value="">Any subject</option>
                    {(meta?.subjects ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <div>
                  <span className="flabel">Your class</span>
                  <div className="field flex items-center gap-2 !bg-chalk text-ink/70">
                    <Icon name="graduationCap" className="h-4 w-4 text-gold-deep" /> {myLevel || "Not set"}
                  </div>
                </div>
              </div>
              <button onClick={requestExam} disabled={reqBusy || !meta} className="btn-gold w-full !rounded-xl disabled:opacity-60">
                <span className="inline-flex items-center gap-1.5">{reqBusy ? "Sending…" : "Request this exam"} <Icon name="checkCircle" className="h-4 w-4" /></span>
              </button>
              {reqMsg && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-800">{reqMsg}</p>}
              <p className="text-center text-xs text-ink/40">Mocks are approved by your tutor. Once approved you&apos;ll get a notification and a Start button here — the paper is set for your class.</p>

              {/* My requests */}
              {requests.length > 0 && (
                <div className="border-t border-line pt-4">
                  <p className="mb-2 flabel">My mock requests</p>
                  <ul className="space-y-2">
                    {requests.map((rq) => {
                      const sm = reqStatusMeta(rq.status);
                      const p = EXAM_PRESETS.find((x) => x.key === rq.preset);
                      return (
                        <li key={rq.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-ink">{rq.subject || "Any subject"} · {p?.label ?? rq.preset}</p>
                            <p className="text-[11px] text-ink/45">
                              {rq.level || "your class"}
                              {rq.scheduled_for ? ` · opens ${new Date(rq.scheduled_for).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                            </p>
                          </div>
                          {rq.startable ? (
                            <button onClick={() => start(rq)} className="btn-gold !min-h-[34px] !rounded-full !px-4 !text-xs">
                              <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" /> Start</span>
                            </button>
                          ) : (
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${sm.cls}`}>{sm.label}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {history.length > 0 && (
                <div className="border-t border-line pt-4">
                  <p className="mb-2 flabel">Recent papers</p>
                  <ul className="space-y-1.5">
                    {history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between rounded-xl bg-chalk px-3 py-2 text-[13px]">
                        <span className="min-w-0 truncate font-semibold text-ink/70">{h.subject || "Mixed"} · {h.correct}/{h.total}</span>
                        <span className={`ml-2 inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${h.percent >= 50 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{h.band} · {h.percent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {phase === "loading" && (
        <div className="card flex items-center justify-center gap-3 p-10 text-ink/50">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" /> Working…
        </div>
      )}

      {/* ── Exam ──────────────────────────────────────────────── */}
      {phase === "exam" && cur && (
        <div className="space-y-4">
          {/* clock + progress */}
          <div className="card flex items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm font-bold text-ink/55">{answered}/{questions.length} answered</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-bold tabular-nums ${secondsLeft <= 60 ? "bg-red-100 text-red-700" : "bg-board/[0.06] text-ink/70 dark:bg-white/10 dark:text-white/80"}`}>
              <Icon name="clock" className="h-4 w-4" /> {mmss(secondsLeft)}
            </span>
          </div>

          {/* question palette */}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => {
              const done = picks[q.id] !== undefined;
              const here = i === idx;
              return (
                <button key={q.id} onClick={() => setIdx(i)}
                  aria-label={`Question ${i + 1}${done ? ", answered" : ""}`}
                  className={`h-7 w-7 rounded-lg text-[11px] font-bold transition ${here ? "bg-board text-white ring-2 ring-gold dark:bg-white dark:text-board" : done ? "bg-gold-pale text-gold-deep" : "bg-ink/5 text-ink/50 hover:bg-ink/10"}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="card p-6">
            <p className="mb-3 text-sm font-bold text-ink/45">Question {idx + 1} of {questions.length}</p>
            <p className="font-display text-lg font-bold text-ink">{cur.question}</p>
            {cur.code && <pre className="mt-3 overflow-x-auto rounded-xl bg-board p-4 text-sm text-gold-soft"><code>{cur.code}</code></pre>}

            <div className="mt-4 space-y-2.5">
              {cur.options.map((opt, i) => {
                const on = picks[cur.id] === i;
                return (
                  <button key={i} onClick={() => choose(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/75 hover:bg-chalk"}`}>
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${on ? "bg-gold text-board" : "bg-ink/5 text-ink/50"}`}>{"ABCDEF"[i]}</span>
                    <span className="min-w-0">{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
                className="btn-ghost !rounded-xl disabled:opacity-40">← Prev</button>
              {idx < questions.length - 1 ? (
                <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} className="btn-gold !rounded-xl flex-1">Next →</button>
              ) : (
                <button onClick={trySubmit} className="btn-gold !rounded-xl flex-1">Submit paper</button>
              )}
            </div>
          </div>

          <button onClick={trySubmit} className="w-full rounded-xl border border-line bg-white py-2.5 text-sm font-bold text-ink/55 transition hover:bg-chalk dark:bg-white/5">
            Submit &amp; see my grade
          </button>
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────── */}
      {phase === "result" && score && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl p-7 text-center text-white"
            style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${score.band.pass ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
              <Icon name={score.band.pass ? "checkCircle" : "close"} className="h-3.5 w-3.5" /> {score.band.label}
            </span>
            <p className="mt-3 font-display text-6xl font-extrabold text-gold">{score.band.grade}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white"><CountUp to={score.percent} duration={900} />%</p>
            <p className="mt-1 text-sm text-white/60">{score.correct} of {score.total} correct</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-sm font-bold text-gold ring-1 ring-gold/25">
              <Icon name="coins" className="h-4 w-4" />
              {score.points > 0 ? `+${score.points} bonus` : "Bonus already earned today"}
            </p>
          </div>

          {/* topic breakdown — focus areas, weakest first */}
          {score.topics.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <Icon name="target" className="h-5 w-5 text-gold-deep" /> Focus areas
              </h2>
              <div className="space-y-3">
                {score.topics.map((t) => (
                  <div key={t.topic}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-semibold text-ink/75">{t.topic}</span>
                      <span className="font-bold text-ink/50">{t.correct}/{t.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                      <div className={`h-full rounded-full ${t.pct >= 50 ? "bg-emerald-500" : "bg-red-400"}`} style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* per-question review */}
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
                    {!r.correct && r.chosen < 0 && <p className="text-ink/40">Not answered</p>}
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
              <span className="inline-flex items-center gap-1.5">New paper <Icon name="repeat" className="h-4 w-4" /></span>
            </button>
            <a href="/portal/practice" className="btn-ghost !rounded-xl">Quick practice</a>
            <a href="/portal/leaderboard" className="btn-ghost !rounded-xl">Leaderboard</a>
          </div>
        </div>
      )}
    </div>
  );
}
