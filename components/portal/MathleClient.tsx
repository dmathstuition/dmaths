"use client";
import { useCallback, useEffect, useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { Icon } from "@/components/Icons";
import { watDay } from "@/lib/dailyReward";
import { dailyEquation, isValidEquation, scoreGuess, MATHLE_LEN, MATHLE_TRIES, type TileState } from "@/lib/mathle";

const STORE = "dmaths-mathle";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "+", "-", "*", "/", "="];

type Saved = { day: string; guesses: string[]; done: boolean; win: boolean; streak: number; lastWin: string };

export default function MathleClient() {
  const [day] = useState(() => watDay());
  const [solution] = useState(() => dailyEquation(watDay()));
  const [guesses, setGuesses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [win, setWin] = useState(false);
  const [streak, setStreak] = useState(0);
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(0);
  const [celebrate, setCelebrate] = useState(0);

  // Restore today's progress (or reset for a new day).
  useEffect(() => {
    try {
      const s: Saved | null = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s && s.day === day) { setGuesses(s.guesses); setDone(s.done); setWin(s.win); setStreak(s.streak); }
      else if (s) { setStreak(s.streak); } // keep the streak, new day's board is fresh
    } catch { /* ignore */ }
  }, [day]);

  const persist = useCallback((next: Partial<Saved>) => {
    try {
      const prev: Saved = JSON.parse(localStorage.getItem(STORE) || "null") || { day, guesses: [], done: false, win: false, streak: 0, lastWin: "" };
      localStorage.setItem(STORE, JSON.stringify({ ...prev, day, ...next }));
    } catch { /* ignore */ }
  }, [day]);

  const submit = useCallback(() => {
    if (done) return;
    if (input.length !== MATHLE_LEN) { setMsg(`Fill all ${MATHLE_LEN} tiles.`); setShake((s) => s + 1); return; }
    if (!isValidEquation(input)) { setMsg("That's not a valid equation."); setShake((s) => s + 1); return; }
    setMsg("");
    const nextGuesses = [...guesses, input];
    const won = input === solution;
    const lost = !won && nextGuesses.length >= MATHLE_TRIES;
    setGuesses(nextGuesses); setInput("");

    if (won || lost) {
      setDone(true); setWin(won);
      // Streak: increment on a win if the last win was not already today.
      let s: Saved | null = null;
      try { s = JSON.parse(localStorage.getItem(STORE) || "null"); } catch { /* ignore */ }
      const newStreak = won ? (s?.lastWin === day ? s.streak : (s?.streak ?? 0) + 1) : 0;
      setStreak(newStreak);
      persist({ guesses: nextGuesses, done: true, win: won, streak: newStreak, lastWin: won ? day : (s?.lastWin ?? "") });
      if (won) setCelebrate((c) => c + 1);
    } else {
      persist({ guesses: nextGuesses, done: false, win: false });
    }
  }, [done, input, guesses, solution, day, persist]);

  const press = useCallback((k: string) => {
    if (done) return;
    setMsg("");
    if (k === "Enter") return submit();
    if (k === "Del") return setInput((v) => v.slice(0, -1));
    setInput((v) => (v.length < MATHLE_LEN ? v + k : v));
  }, [done, submit]);

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") press("Enter");
      else if (e.key === "Backspace") press("Del");
      else if (KEYS.includes(e.key)) press(e.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const rows = Array.from({ length: MATHLE_TRIES }, (_, r) => {
    if (r < guesses.length) return { chars: guesses[r].split(""), states: scoreGuess(guesses[r], solution), filled: true };
    if (r === guesses.length && !done) return { chars: input.padEnd(MATHLE_LEN).split(""), states: null, filled: false };
    return { chars: "        ".split(""), states: null, filled: false };
  });

  const tileClass = (st: TileState | null, ch: string) =>
    st === "correct" ? "bg-emerald-500 text-white border-emerald-500"
    : st === "present" ? "bg-gold text-board border-gold"
    : st === "absent" ? "bg-slate-400 text-white border-slate-400"
    : ch.trim() ? "border-ink/40 text-ink" : "border-line text-ink";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={60} /></div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink/50">Guess the equation · {MATHLE_TRIES} tries</p>
        {streak > 0 && <span className="inline-flex items-center gap-1 text-sm font-bold text-gold-deep"><Icon name="flame" className="h-4 w-4" /> {streak}-day streak</span>}
      </div>

      {/* Grid */}
      <div className="space-y-1.5" key={shake}>
        {rows.map((row, r) => (
          <div key={r} className={`grid grid-cols-8 gap-1.5 ${r === guesses.length && !done && shake ? "animate-[shake_.3s]" : ""}`}>
            {row.chars.map((ch, c) => (
              <div key={c} className={`flex aspect-square items-center justify-center rounded-lg border-2 font-display text-lg font-extrabold transition ${tileClass(row.states ? row.states[c] : null, ch)}`}>
                {ch.trim()}
              </div>
            ))}
          </div>
        ))}
      </div>

      {msg && <p className="text-center text-sm font-semibold text-red-600">{msg}</p>}

      {done ? (
        <div className="card p-5 text-center">
          <p className="font-display text-lg font-bold text-ink">{win ? "🎉 Solved it!" : "So close!"}</p>
          <p className="mt-1 text-sm text-ink/60">The equation was <span className="font-mono font-bold text-ink">{solution}</span>. Come back tomorrow for a new one.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-10 gap-1.5">
            {KEYS.map((k) => (
              <button key={k} onClick={() => press(k)}
                className="flex h-11 items-center justify-center rounded-lg bg-chalk font-display text-base font-bold text-ink hover:bg-ink/10">{k}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => press("Del")} className="flex h-11 items-center justify-center rounded-lg bg-chalk font-bold text-ink/70 hover:bg-ink/10">Delete</button>
            <button onClick={() => press("Enter")} className="btn-gold flex h-11 items-center justify-center !rounded-lg">Enter</button>
          </div>
        </div>
      )}

      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }`}</style>
    </div>
  );
}
