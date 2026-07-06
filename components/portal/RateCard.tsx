"use client";
import { useEffect, useState } from "react";

// Compact "How are we doing?" star-rating widget for students & parents.
// Submits to /api/ratings; once submitted (this session or previously, tracked
// in localStorage) it shows a thank-you state so it never nags.
const DONE_KEY = "dmaths-rated";

export default function RateCard() {
  const [done, setDone] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try { if (localStorage.getItem(DONE_KEY)) setDone(true); } catch {}
  }, []);

  async function submit() {
    if (stars < 1) { setError("Tap a star to rate first."); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/ratings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars, comment }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not send — please try again.");
      return;
    }
    try { localStorage.setItem(DONE_KEY, "1"); } catch {}
    setDone(true);
  }

  if (done) {
    return (
      <div className="card flex items-center gap-3 p-5">
        <span className="text-2xl">💛</span>
        <p className="text-sm font-semibold text-ink/70">Thanks for your feedback — it helps us improve D-Maths.</p>
      </div>
    );
  }

  const active = hover || stars;
  return (
    <div className="card p-6">
      <h2 className="font-display text-lg font-semibold">How are we doing?</h2>
      <p className="mt-1 text-sm text-ink/50">Your rating goes straight to the D-Maths team.</p>

      <div className="mt-4 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={`text-3xl leading-none transition-transform hover:scale-110 ${n <= active ? "text-gold" : "text-line"}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="field mt-4 min-h-20"
        placeholder="Anything you'd like us to know? (optional)"
        value={comment}
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}

      <button onClick={submit} disabled={busy} className="btn-gold mt-4 w-full !min-h-[46px]">
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </div>
  );
}
