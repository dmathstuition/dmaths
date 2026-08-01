"use client";
import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { makeQuestion, type Question } from "@/lib/mathSprint";

const DURATION = 60;
const BEST_KEY = "dmaths-sprint-best";
type Phase = "idle" | "play" | "over";

// A 60-second mental-maths sprint — pure fun & practice. Personal best lives in
// localStorage (no backend), so there's nothing to cheat and nothing to migrate.
export default function MathSprintClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [q, setQ] = useState<Question>(() => makeQuestion());
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [best, setBest] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { try { setBest(Number(localStorage.getItem(BEST_KEY) || 0)); } catch {} }, []);

  // Countdown while playing.
  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setTime((s) => (s <= 1 ? (setPhase("over"), 0) : s - 1)), 1000);
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

  function start() {
    setScore(0); setTime(DURATION); setInput(""); setQ(makeQuestion()); setFlash(null); setPhase("play");
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "play" || input.trim() === "") return;
    if (Number(input) === q.answer) {
      setScore((s) => s + 1); setFlash("ok"); setQ(makeQuestion());
    } else {
      setFlash("no");
    }
    setInput("");
    setTimeout(() => setFlash(null), 180);
    inputRef.current?.focus();
  }

  const isBest = phase === "over" && score >= best && score > 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={48} /></div>

      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lift sm:p-9"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 60%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />

        {phase === "idle" && (
          <div className="relative text-center">
            <p className="text-4xl">⚡️</p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">Math Sprint</h1>
            <p className="mt-1 text-sm text-white/60">How many can you solve in 60 seconds?</p>
            {best > 0 && <p className="mt-3 text-sm font-bold text-gold">🏆 Your best: {best}</p>}
            <button onClick={start} className="btn-gold mt-6 !rounded-full !px-8">Start ⚡️</button>
          </div>
        )}

        {phase === "play" && (
          <div className="relative">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-gold">Score {score}</span>
              <span className={time <= 10 ? "text-red-300" : "text-white/70"}>⏱ {time}s</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-1000 ease-linear"
                style={{ width: `${(time / DURATION) * 100}%` }} />
            </div>

            <div className={`mt-8 rounded-2xl bg-white/5 py-8 text-center transition ${flash === "ok" ? "ring-2 ring-emerald-400" : flash === "no" ? "ring-2 ring-red-400" : "ring-1 ring-white/10"}`}>
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
            <p className="text-4xl">{isBest ? "🎉" : "⏱"}</p>
            <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{isBest ? "New personal best!" : "Time's up!"}</h1>
            <p className="mt-3 font-display text-6xl font-extrabold text-gold">{score}</p>
            <p className="text-sm text-white/60">correct in 60 seconds{!isBest && best > 0 ? ` · best ${best}` : ""}</p>
            <button onClick={start} className="btn-gold mt-6 !rounded-full !px-8">Play again ⚡️</button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink/45">
        Sharpen your mental maths — correct answers only count when you get them right. It&apos;s just for fun &amp; practice. 💪
      </p>
    </div>
  );
}
