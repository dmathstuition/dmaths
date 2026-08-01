"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Confetti from "@/components/ui/Confetti";

type State = "loading" | "ready" | "claimed" | "opening";

// A once-a-day treasure chest that credits bonus reward points — a reason to
// open the app every day. Self-contained: fetches its own status, so pages just
// drop it in. Renders nothing if the feature/migration isn't available.
export default function DailyRewardChest() {
  const [state, setState] = useState<State>("loading");
  const [won, setWon] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/rewards/daily")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (!alive) return;
        if (j.claimedToday) { setWon(j.points ?? null); setState("claimed"); }
        else setState("ready");
      })
      .catch(() => { if (alive) setHide(true); }); // feature not available → don't show
    return () => { alive = false; };
  }, []);

  async function open() {
    if (state !== "ready") return;
    setState("opening");
    const res = await fetch("/api/rewards/daily", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (j.claimedToday) { setWon(j.points ?? null); setState("claimed"); }
      else setState("ready");
      return;
    }
    setWon(j.points);
    setState("claimed");
    setCelebrate((c) => c + 1);
  }

  if (hide || state === "loading") return null;

  const opened = state === "claimed";

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lift ${opened ? "bg-board" : ""}`}
      style={!opened ? { background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 55%, #3730A3 100%)" } : undefined}>
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={40} /></div>

      <div aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl ring-1 ring-white/25 ${opened ? "" : "badge-pulse"}`}>
          {opened ? "✅" : "🎁"}
        </span>
        <div className="min-w-0 flex-1">
          {opened ? (
            <>
              <p className="font-display text-lg font-bold">
                {won != null ? <>+{won} points today! 🪙</> : "Reward claimed!"}
              </p>
              <p className="text-sm text-white/60">Come back tomorrow for another chest.</p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-bold">Your daily reward is ready!</p>
              <p className="text-sm text-white/70">Open the chest for bonus points 🪙</p>
            </>
          )}
        </div>
        {opened ? (
          <Link href="/portal/shop" className="flex-shrink-0 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/25">
            Spend →
          </Link>
        ) : (
          <button onClick={open} disabled={state === "opening"}
            className="flex-shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[#4F46E5] shadow transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-70">
            {state === "opening" ? "Opening…" : "Open 🎁"}
          </button>
        )}
      </div>
    </div>
  );
}
