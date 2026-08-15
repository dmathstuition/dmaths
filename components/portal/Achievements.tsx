"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import Confetti from "@/components/ui/Confetti";

type Achievement = {
  id: string; name: string; desc: string; icon: string; target: number; reward: number;
  current: number; unlocked: boolean; claimed: boolean;
};

// A learner's trophy room — each unlocked achievement pays a one-time bonus to
// claim. Fetches its own state so claiming updates live.
export default function Achievements() {
  const [list, setList] = useState<Achievement[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/achievements", { cache: "no-store" });
        const j = await r.json();
        if (j.error || !Array.isArray(j.achievements)) { setHidden(true); return; }
        setList(j.achievements);
      } catch { setHidden(true); }
    })();
  }, []);

  async function claim(id: string) {
    setBusy(id);
    try {
      const r = await fetch("/api/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const j = await r.json();
      if (r.ok && j.claimed) {
        setList((prev) => prev?.map((a) => a.id === id ? { ...a, claimed: true } : a) ?? prev);
        if ((j.reward ?? 0) > 0) setCelebrate((c) => c + 1);
      }
    } finally { setBusy(null); }
  }

  if (hidden || !list) return null;
  const got = list.filter((a) => a.unlocked).length;
  const claimable = list.filter((a) => a.unlocked && !a.claimed).length;

  return (
    <div className="card neu-card p-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={48} /></div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="trophy" className="h-5 w-5 text-gold-deep" /> Achievements
        </h2>
        <span className="rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep">
          {got}/{list.length}{claimable > 0 ? ` · ${claimable} to claim` : ""}
        </span>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-700" style={{ width: `${Math.round((got / list.length) * 100)}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((a) => (
          <div key={a.id}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              a.unlocked ? "border-gold/40 bg-gold-pale/50 dark:bg-gold/10" : "border-line bg-chalk/50 dark:bg-white/[0.02]"}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              a.unlocked ? "bg-gold text-board shadow-[0_6px_18px_-6px_rgba(239,174,86,.8)]" : "bg-ink/5 text-ink/25"}`}>
              <Icon name={a.icon as IconName} className="h-6 w-6" />
            </span>
            <div>
              <p className={`text-[13px] font-bold ${a.unlocked ? "text-ink" : "text-ink/45"}`}>{a.name}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-ink/40">{a.unlocked ? a.desc : a.desc}</p>
            </div>
            {a.unlocked && !a.claimed ? (
              <button onClick={() => claim(a.id)} disabled={busy === a.id}
                className="btn-gold !min-h-[30px] !rounded-full !px-3 !text-[11px] disabled:opacity-50">
                {busy === a.id ? "…" : <span className="inline-flex items-center gap-1"><Icon name="coins" className="h-3 w-3" /> Claim +{a.reward}</span>}
              </button>
            ) : a.claimed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><Icon name="checkCircle" className="h-3.5 w-3.5" /> Claimed</span>
            ) : (
              <span className="text-[10px] font-bold text-ink/35">{a.target > 1 ? `${a.current}/${a.target}` : "Locked"} · +{a.reward}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
