"use client";
import { useEffect, useState } from "react";
import { REACTIONS, getClientId } from "@/lib/blog";

// Emoji reactions for a post. Anonymous — each browser gets a stable id so it
// can toggle its own reactions. Counts load and update through the public API.
export default function ReactionBar({ postId }: { postId: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string[]>([]);
  const [cid, setCid] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const id = getClientId();
    setCid(id);
    fetch(`/api/blog/react?postId=${encodeURIComponent(postId)}&clientId=${encodeURIComponent(id)}`)
      .then((r) => r.json()).then((j) => { setCounts(j.counts ?? {}); setMine(j.mine ?? []); })
      .catch(() => {});
  }, [postId]);

  async function toggle(emoji: string) {
    if (!cid || busy) return;
    setBusy(emoji);
    try {
      const res = await fetch("/api/blog/react", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, clientId: cid, emoji }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setCounts(j.counts ?? {}); setMine(j.mine ?? []); }
    } catch { /* ignore */ }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[13px] font-semibold text-ink/50">Found this useful?</span>
      {REACTIONS.map((r) => {
        const active = mine.includes(r.emoji);
        const n = counts[r.emoji] ?? 0;
        return (
          <button key={r.emoji} onClick={() => toggle(r.emoji)} disabled={busy === r.emoji} aria-pressed={active}
            title={r.label}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
              active ? "border-gold bg-gold/15 text-gold-deep" : "border-line bg-white text-ink/60 hover:border-gold/40"} ${busy === r.emoji ? "opacity-60" : ""}`}>
            <span className="text-base leading-none">{r.emoji}</span>
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
