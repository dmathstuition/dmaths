"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import Confetti from "@/components/ui/Confetti";

const PRESETS = [15, 25, 50];
const RING = 2 * Math.PI * 86; // r = 86

// A Pomodoro-style focus timer. Counts down, keeps ticking accurately across
// tab-throttling (wall-clock based, not interval-count based), and logs the
// finished session so the learner's study effort is tracked.
export default function FocusTimer({ subjects = [] }: { subjects?: string[] }) {
  const router = useRouter();
  const push = useToast();

  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState("");
  const [left, setLeft] = useState(25 * 60);      // seconds remaining
  const [running, setRunning] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const endAt = useRef<number | null>(null);
  const saving = useRef(false);

  // Wall-clock countdown — survives background tabs and throttled intervals.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAt.current === null) return;
      const secs = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(secs);
      if (secs === 0) finish(minutes, true);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, minutes]);

  function start() {
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  }
  function pause() {
    setRunning(false);
    endAt.current = null;
  }
  function reset(mins = minutes) {
    setRunning(false);
    endAt.current = null;
    setMinutes(mins);
    setLeft(mins * 60);
  }

  async function finish(mins: number, completed: boolean) {
    if (saving.current) return;
    saving.current = true;
    setRunning(false);
    endAt.current = null;

    const done = completed ? mins : Math.round((mins * 60 - left) / 60);
    if (done < 1) { saving.current = false; setLeft(mins * 60); push("Nothing to log yet — study for at least a minute.", "info"); return; }

    const res = await fetch("/api/study-sessions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: done, subject }),
    });
    saving.current = false;
    setLeft(mins * 60);

    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not save your session.", "error"); return; }
    setCelebrate((c) => c + 1);
    push(`Nice work — ${done} minute${done === 1 ? "" : "s"} of focus logged! 🎉`, "success");
    router.refresh();
  }

  const total = minutes * 60;
  const progress = total ? (total - left) / total : 0;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="card neu-card p-6 sm:p-8">
      <Confetti fire={celebrate > 0} key={celebrate} />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
        {/* Dial */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <svg width={200} height={200} className="-rotate-90" aria-hidden>
            <circle cx={100} cy={100} r={86} fill="none" stroke="rgba(26,96,171,.10)" strokeWidth={14} />
            <circle cx={100} cy={100} r={86} fill="none" stroke="url(#focusGrad)" strokeWidth={14}
              strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING - progress * RING}
              style={{ transition: "stroke-dashoffset .3s linear" }} />
            <defs>
              <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F4C078" /><stop offset="100%" stopColor="#1A60AB" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-extrabold tabular-nums text-ink">{mm}:{ss}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/40">
              {running ? "Focusing…" : "Ready"}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink/40">Session length</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <button key={m} onClick={() => reset(m)} disabled={running}
                className={`rounded-xl border px-4 py-2 text-sm font-bold transition disabled:opacity-40 ${
                  minutes === m ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
                {m} min
              </button>
            ))}
          </div>

          {subjects.length > 0 && (
            <>
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-ink/40">Subject (optional)</p>
              <select className="field mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={running}>
                <option value="">Anything</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {running ? (
              <>
                <button onClick={pause} className="btn-ghost !min-h-[44px] inline-flex items-center gap-2">
                  <Icon name="stop" className="h-4 w-4" /> Pause
                </button>
                <button onClick={() => finish(minutes, false)} className="btn-ink !min-h-[44px]">End &amp; save</button>
              </>
            ) : (
              <>
                <button onClick={start} className="btn-gold !min-h-[44px] !px-7 inline-flex items-center gap-2">
                  <Icon name="zap" className="h-4 w-4" /> {left < total ? "Resume" : "Start focusing"}
                </button>
                {left < total && <button onClick={() => reset()} className="btn-ghost !min-h-[44px]">Reset</button>}
              </>
            )}
          </div>
          <p className="mt-3 text-[12px] text-ink/45">
            Put your phone down and work until the timer ends — your focus minutes are tracked below.
          </p>
        </div>
      </div>
    </div>
  );
}
