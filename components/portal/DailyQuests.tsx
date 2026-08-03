"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import Confetti from "@/components/ui/Confetti";

type Quest = { id: string; label: string; target: number; current: number; done: boolean; icon: string; href: string };

export default function DailyQuests() {
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [bonus, setBonus] = useState(15);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/quests", { cache: "no-store" });
        const j = await r.json();
        if (j.error || !Array.isArray(j.quests) || !j.quests.length) { setHidden(true); return; }
        setQuests(j.quests); setAllDone(j.allDone); setClaimed(j.claimed); setBonus(j.bonus ?? 15);
      } catch { setHidden(true); }
    })();
  }, []);

  async function claim() {
    setBusy(true);
    try {
      const r = await fetch("/api/quests", { method: "POST" });
      const j = await r.json();
      if (r.ok && j.claimed) { setClaimed(true); if ((j.bonus ?? 0) > 0) setCelebrate((c) => c + 1); }
    } finally { setBusy(false); }
  }

  if (hidden || !quests) return null;
  const done = quests.filter((q) => q.done).length;

  return (
    <div className="card neu-card relative overflow-hidden p-6">
      <div className="pointer-events-none fixed inset-0 z-[60]"><Confetti fire={celebrate > 0} key={celebrate} pieces={52} /></div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="target" className="h-5 w-5 text-gold-deep" /> Daily quests
        </h2>
        <span className="rounded-full bg-chalk px-2.5 py-1 text-[11px] font-bold text-ink/50">{done}/{quests.length} done</span>
      </div>

      <div className="space-y-2.5">
        {quests.map((q) => (
          <Link key={q.id} href={q.href}
            className={`flex items-center gap-3 rounded-2xl border p-3 transition ${q.done ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10" : "border-line bg-white hover:bg-chalk dark:bg-white/[0.03]"}`}>
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${q.done ? "bg-emerald-500 text-white" : "bg-gold-pale text-gold-deep"}`}>
              <Icon name={(q.done ? "checkCircle" : q.icon) as IconName} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-bold ${q.done ? "text-emerald-700 dark:text-emerald-400" : "text-ink"}`}>{q.label}</p>
              {q.target > 1 && !q.done && (
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-500" style={{ width: `${Math.round((q.current / q.target) * 100)}%` }} />
                </div>
              )}
            </div>
            <span className="flex-shrink-0 text-[11px] font-bold text-ink/40">{q.done ? "Done" : `${q.current}/${q.target}`}</span>
          </Link>
        ))}
      </div>

      {/* all-clear bonus */}
      <div className="mt-4">
        {claimed ? (
          <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 py-2.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10">
            <Icon name="checkCircle" className="h-4 w-4" /> Daily bonus claimed — see you tomorrow!
          </p>
        ) : allDone ? (
          <button onClick={claim} disabled={busy} className="btn-gold w-full !rounded-2xl disabled:opacity-60">
            {busy ? "Claiming…" : <span className="inline-flex items-center gap-1.5"><Icon name="gift" className="h-4 w-4" /> Claim +{bonus} bonus</span>}
          </button>
        ) : (
          <p className="text-center text-[12px] text-ink/45">Clear all three today for a <span className="font-bold text-gold-deep">+{bonus}</span> bonus.</p>
        )}
      </div>
    </div>
  );
}
