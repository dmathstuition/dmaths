"use client";
import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { Icon } from "@/components/Icons";
import {
  makeStagePool, makeStagedQuestion,
  SPRINT_STAGES, SPRINT_ADVANCE, MAX_STAGE, type Question,
} from "@/lib/mathSprint";

const DURATION = 60;
const BEST_KEY = "dmaths-sprint-best";
const POOL = 12;
type Phase = "idle" | "play" | "over";

// A 60-second mental-maths sprint that climbs through stages of increasing
// difficulty. Questions come from the A.I (staged pools fetched at start), with
// an instant local generator as the always-ready fallback so play never blocks.
// Personal best lives in localStorage — it's just-for-fun, nothing to migrate.
export default function MathSprintClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [cleared, setCleared] = useState(0); // correct answers in the current stage
  const [q, setQ] = useState<Question>(() => makeStagedQuestion(1));
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [best, setBest] = useState(0);
  const [topStage, setTopStage] = useState(1);
  const [celebrate, setCelebrate] = useState(0);
  const [stageUp, setStageUp] = useState(0);
  const [aiOn, setAiOn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Per-stage question pools + a cursor into each. Refs so the submit handler
  // always draws from the freshest pool without re-subscribing effects.
  const poolsRef = useRef<Record<number, Question[]>>({});
  const curRef = useRef<Record<number, number>>({});

  useEffect(() => { try { setBest(Number(localStorage.getItem(BEST_KEY) || 0)); } catch {} }, []);

  function seedLocal() {
    const pools: Record<number, Question[]> = {};
    const cur: Record<number, number> = {};
    for (const s of SPRINT_STAGES) { pools[s.stage] = makeStagePool(s.stage, POOL); cur[s.stage] = 0; }
    poolsRef.current = pools; curRef.current = cur;
  }

  function draw(s: number): Question {
    const pool = poolsRef.current[s] ?? (poolsRef.current[s] = makeStagePool(s, POOL));
    const i = curRef.current[s] ?? 0;
    if (i >= pool.length) pool.push(...makeStagePool(s, POOL)); // top up so it never runs dry
    const question = pool[i] ?? makeStagedQuestion(s);
    curRef.current[s] = i + 1;
    return question;
  }

  // Countdown while playing.
  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setTime((x) => (x <= 1 ? (setPhase("over"), 0) : x - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Save a new best when the round ends.
  useEffect(() => {
    if (phase !== "over") return;
    if (score > best) {
      setBest(score);
      try { localStorage.setItem(BEST_KEY, String(score)); } catch {}
      setCelebrate((c) => c + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function start() {
    seedLocal();
    setScore(0); setTime(DURATION); setInput(""); setStage(1); setCleared(0); setTopStage(1);
    setQ(draw(1)); setFlash(null); setAiOn(false); setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 60);

    // Fetch richer A.I questions in the background and fold them into the stages
    // the learner hasn't reached yet (the current stage keeps what it's on).
    try {
      const res = await fetch("/api/ai/sprint", { method: "POST" });
      if (!res.ok) return;
      const j = await res.json();
      for (const st of (j.stages ?? []) as { stage: number; questions: Question[] }[]) {
        if (!Array.isArray(st.questions) || !st.questions.length) continue;
        const played = curRef.current[st.stage] ?? 0;
        poolsRef.current[st.stage] = played === 0
          ? st.questions
          : [...(poolsRef.current[st.stage] ?? []).slice(0, played), ...st.questions];
      }
      setAiOn(true);
    } catch { /* local pools already cover the whole game */ }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "play" || input.trim() === "") return;
    if (Number(input) === q.answer) {
      setScore((s) => s + 1);
      setFlash("ok");
      const nextCleared = cleared + 1;
      if (nextCleared >= SPRINT_ADVANCE && stage < MAX_STAGE) {
        const ns = stage + 1;
        setStage(ns); setCleared(0); setTopStage((t) => Math.max(t, ns)); setStageUp((u) => u + 1);
        setQ(draw(ns));
      } else {
        setCleared(nextCleared);
        setQ(draw(stage));
      }
    } else {
      setFlash("no");
    }
    setInput("");
    setTimeout(() => setFlash(null), 180);
    inputRef.current?.focus();
  }

  const meta = SPRINT_STAGES[stage - 1] ?? SPRINT_STAGES[0];
  const isBest = phase === "over" && score >= best && score > 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={48} /></div>

      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lift sm:p-9"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />

        {phase === "idle" && (
          <div className="relative text-center">
            <p className="flex justify-center text-gold"><Icon name="zap" className="h-10 w-10" /></p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Math Sprint</h1>
            <p className="mt-1 text-sm text-white/60">How far can you climb in 60 seconds? Clear {SPRINT_ADVANCE} to level up.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {SPRINT_STAGES.map((s) => (
                <span key={s.stage} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/70">{s.stage}. {s.name}</span>
              ))}
            </div>
            {best > 0 && <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold"><Icon name="trophy" className="h-4 w-4" /> Your best: {best}</p>}
            <button onClick={start} className="btn-gold mt-6 !rounded-full !px-8"><span className="inline-flex items-center gap-1.5">Start <Icon name="zap" className="h-4 w-4" /></span></button>
          </div>
        )}

        {phase === "play" && (
          <div className="relative">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-gold">Score {score}</span>
              <span className={`inline-flex items-center gap-1 ${time <= 10 ? "text-red-300" : "text-white/70"}`}><Icon name="clock" className="h-4 w-4" /> {time}s</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-1000 ease-linear"
                style={{ width: `${(time / DURATION) * 100}%` }} />
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
              <span key={stageUp} className="badge-pulse inline-flex items-center gap-1 rounded-full bg-gold/20 px-2.5 py-1 text-gold">
                <Icon name="trophy" className="h-3.5 w-3.5" /> Stage {stage} · {meta.name}
              </span>
              <span className="text-white/40">{aiOn ? "A.I questions" : meta.hint}</span>
            </div>
            <div className="mt-1.5 flex gap-1">
              {Array.from({ length: SPRINT_ADVANCE }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < cleared ? "bg-gold" : "bg-white/12"}`} />
              ))}
            </div>

            <div className={`mt-6 rounded-2xl bg-white/5 py-8 text-center transition ${flash === "ok" ? "ring-2 ring-emerald-400" : flash === "no" ? "ring-2 ring-red-400" : "ring-1 ring-white/10"}`}>
              <p className="font-display text-4xl font-extrabold tracking-wide sm:text-5xl">{q.text}</p>
            </div>

            <form onSubmit={submit} className="mt-5 flex gap-2">
              <input ref={inputRef} inputMode="numeric" pattern="-?[0-9]*" autoComplete="off"
                value={input} onChange={(e) => setInput(e.target.value.replace(/[^\d-]/g, ""))}
                placeholder="Answer" aria-label="Your answer"
                className="flex-1 rounded-xl border-0 bg-white px-4 py-3 text-center font-display text-xl font-bold text-ink outline-none ring-2 ring-transparent focus:ring-gold" />
              <button className="btn-gold flex-shrink-0 !rounded-xl !px-6">Go</button>
            </form>
          </div>
        )}

        {phase === "over" && (
          <div className="relative text-center">
            <p className="flex justify-center text-gold">{isBest ? <Icon name="partyPopper" className="h-10 w-10" /> : <Icon name="clock" className="h-10 w-10" />}</p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{isBest ? "New personal best!" : "Time's up!"}</h1>
            <p className="mt-3 font-display text-6xl font-extrabold text-gold">{score}</p>
            <p className="text-sm text-white/60">correct · reached <strong className="text-white/80">Stage {topStage} ({(SPRINT_STAGES[topStage - 1] ?? meta).name})</strong>{!isBest && best > 0 ? ` · best ${best}` : ""}</p>
            <button onClick={start} className="btn-gold mt-6 !rounded-full !px-8"><span className="inline-flex items-center gap-1.5">Play again <Icon name="zap" className="h-4 w-4" /></span></button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink/45">
        Sharpen your mental maths — clear {SPRINT_ADVANCE} in a row to climb to harder stages. It&apos;s just for fun &amp; practice. 💪
      </p>
    </div>
  );
}
