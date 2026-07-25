"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { savedDeckIds } from "@/lib/offlineDecks";

// One IndexedDB read for the whole list, shared by every chip on the page.
let cache: Promise<string[]> | null = null;

// Shown on a deck the learner has already opened once — its cards live on this
// device, so it can still be revised with no connection.
export default function OfflineChip({ deckId }: { deckId: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!cache) cache = savedDeckIds();
    let alive = true;
    cache.then((ids) => { if (alive) setSaved(ids.includes(deckId)); });
    return () => { alive = false; };
  }, [deckId]);

  if (!saved) return null;

  return (
    <span
      title="Saved on this device — you can revise this deck without a connection"
      className="inline-flex items-center gap-1 rounded-full bg-chalk px-2 py-0.5 text-[11px] font-bold text-ink/55"
    >
      <Icon name="download" className="h-3 w-3" />
      Offline ✓
    </span>
  );
}
