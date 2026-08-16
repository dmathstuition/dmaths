"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

// A learner-facing "2× points" banner shown only while Happy Hour is live.
export default function HappyHourBanner() {
  const [until, setUntil] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    (async () => {
      try { const r = await fetch("/api/happy-hour", { cache: "no-store" }); const j = await r.json(); setUntil(j.until ?? null); }
      catch { /* ignore */ }
    })();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = !!until && new Date(until).getTime() > now;
  if (!active) return null;
  const leftMin = Math.ceil((new Date(until!).getTime() - now) / 60000);

  return (
    <div className="badge-pulse flex flex-wrap items-center gap-3 rounded-2xl border border-gold/40 bg-gold-pale px-5 py-3.5">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold text-board"><Icon name="zap" className="h-5 w-5" /></span>
      <p className="min-w-0 flex-1 text-sm font-bold text-ink">
        ⚡ Happy Hour — 2× reward points on practice, mocks &amp; flashcards! <span className="font-semibold text-ink/55">{leftMin}m left</span>
      </p>
      <a href="/portal/practice" className="btn-gold !min-h-[36px] flex-shrink-0 !rounded-full">Earn now →</a>
    </div>
  );
}
