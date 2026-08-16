"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

export default function HappyHourControl() {
  const [until, setUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try { const r = await fetch("/api/happy-hour", { cache: "no-store" }); const j = await r.json(); setUntil(j.until ?? null); }
    catch { /* keep */ }
  }
  useEffect(() => { load(); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const active = !!until && new Date(until).getTime() > now;
  const leftMin = active ? Math.ceil((new Date(until!).getTime() - now) / 60000) : 0;

  async function send(payload: any) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/happy-hour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't update Happy Hour."); return; }
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Icon name="zap" className="h-5 w-5 text-gold-deep" /> Happy Hour <span className="rounded-full bg-gold-pale px-2 py-0.5 text-[11px] font-bold text-gold-deep">2× points</span>
      </h2>
      <p className="mt-1 text-sm text-ink/55">Start a window where practice, mocks &amp; flashcards pay double — a burst of engagement.</p>
      {err && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}
      {active ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="badge-pulse inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-sm font-extrabold text-board"><Icon name="zap" className="h-4 w-4" /> Live · {leftMin}m left</span>
          <button onClick={() => send({ stop: true })} disabled={busy} className="btn-ghost !rounded-xl">Stop now</button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {[30, 60, 120].map((m) => (
            <button key={m} onClick={() => send({ minutes: m })} disabled={busy} className="btn-gold !rounded-xl">
              {busy ? "…" : `Start ${m < 60 ? `${m}m` : `${m / 60}h`}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
