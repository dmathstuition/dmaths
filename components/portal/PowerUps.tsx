"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import Confetti from "@/components/ui/Confetti";

type PowerUp = { key: string; name: string; blurb: string; cost: number; icon: string };

function boostLeft(boostUntil: string | null): number {
  return boostUntil ? Math.max(0, new Date(boostUntil).getTime() - Date.now()) : 0;
}

export default function PowerUps() {
  const [powerups, setPowerups] = useState<PowerUp[] | null>(null);
  const [spendable, setSpendable] = useState(0);
  const [freezes, setFreezes] = useState(0);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [celebrate, setCelebrate] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/powerups", { cache: "no-store" });
        if (!r.ok) { setHidden(true); return; }
        const j = await r.json();
        setPowerups(j.powerups ?? []); setSpendable(j.spendable ?? 0);
        setFreezes(j.freezes ?? 0); setBoostUntil(j.boostUntil ?? null);
      } catch { setHidden(true); }
    })();
  }, []);

  // Tick once a second while a boost is running so the countdown updates.
  useEffect(() => {
    if (!boostUntil || boostLeft(boostUntil) <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [boostUntil]);

  async function buy(key: string) {
    setBusy(key); setErr("");
    try {
      const r = await fetch("/api/powerups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't buy that — try again."); return; }
      setSpendable(j.spendable ?? spendable); setFreezes(j.freezes ?? freezes); setBoostUntil(j.boostUntil ?? boostUntil);
      setCelebrate((c) => c + 1);
    } finally { setBusy(null); }
  }

  if (hidden || !powerups) return null;
  const leftMs = boostLeft(boostUntil);
  const boostRunning = leftMs > 0;
  void now; // countdown re-render tick

  return (
    <div className="card neu-card p-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={40} /></div>

      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="zap" className="h-5 w-5 text-gold-deep" /> Power-ups
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep"><Icon name="coins" className="h-3 w-3" /> {spendable}</span>
      </div>
      <p className="mb-4 text-[13px] text-ink/50">Consumables to keep your streak alive and earn faster.</p>

      {err && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {powerups.map((p) => {
          const owned = p.key === "freeze" ? freezes : 0;
          const active = p.key === "boost" && boostRunning;
          const affordable = spendable >= p.cost;
          const mins = Math.ceil(leftMs / 60000);
          return (
            <div key={p.key} className={`flex flex-col rounded-2xl border p-4 transition ${active ? "border-gold bg-gold-pale/60" : "border-line bg-white dark:bg-white/[0.03]"}`}>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep"><Icon name={p.icon as IconName} className="h-4 w-4" /></span>
                <p className="font-display text-sm font-bold text-ink">{p.name}</p>
                {p.key === "freeze" && owned > 0 && <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">×{owned} in stock</span>}
                {active && <span className="ml-auto rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold text-board">{mins}m left</span>}
              </div>
              <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-ink/55">{p.blurb}</p>
              <button onClick={() => buy(p.key)} disabled={busy === p.key || !affordable || active}
                className="btn-gold mt-3 !min-h-[38px] !rounded-xl !text-[13px] disabled:opacity-40"
                title={active ? "Already active" : affordable ? "" : `Need ${p.cost} points`}>
                {busy === p.key ? "…" : active ? "Active" : <span className="inline-flex items-center gap-1.5"><Icon name="coins" className="h-3.5 w-3.5" /> {p.cost}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
