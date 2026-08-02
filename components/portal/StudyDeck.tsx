"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import Confetti from "@/components/ui/Confetti";
import type { Grade } from "@/lib/srs";
import { saveDeck, getDeck, queueReview, drainQueue, type QueuedReview } from "@/lib/offlineDecks";

type Card = { id: string; front: string; back: string };

const GRADES: { key: Grade; label: string; hint: string; cls: string }[] = [
  { key: "again", label: "Again", hint: "Didn't know it", cls: "bg-red-50 text-red-600 hover:bg-red-100" },
  { key: "hard",  label: "Hard",  hint: "Struggled",      cls: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { key: "good",  label: "Good",  hint: "Got it",         cls: "bg-sky-50 text-sky-700 hover:bg-sky-100" },
  { key: "easy",  label: "Easy",  hint: "Instant recall", cls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
];

// Study one deck: show the question, flip for the answer, then say how well you
// recalled it. The server decides when the card comes back.
export default function StudyDeck({ deck, cards, totalCards }: {
  deck: { id: string; title: string; subject: string | null }; cards: Card[]; totalCards: number;
}) {
  const router = useRouter();
  const push = useToast();
  const [queue, setQueue] = useState<Card[]>(cards);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  // Keep this deck usable without a connection, and flush anything graded
  // offline as soon as we're back.
  useEffect(() => {
    if (cards.length) saveDeck(deck.id, cards);

    const sync = async () => {
      const { synced } = await drainQueue(async (r: QueuedReview) => {
        const res = await fetch("/api/flashcards/review", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: r.cardId, grade: r.grade }),
        });
        return res.ok;
      });
      if (synced > 0) {
        setPending((p) => Math.max(0, p - synced));
        push(`${synced} offline review${synced === 1 ? "" : "s"} synced.`, "success");
        router.refresh();
      }
    };

    const goOnline = () => { setOffline(false); sync(); };
    const goOffline = () => setOffline(true);
    setOffline(!navigator.onLine);
    if (navigator.onLine) sync();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  // If we opened with no connection and no server cards, fall back to the copy
  // saved on this device.
  useEffect(() => {
    if (queue.length === 0 && cards.length === 0) {
      getDeck(deck.id).then((saved) => { if (saved?.length) setQueue(saved); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id]);

  const card = queue[i];
  const finished = !card;

  async function grade(g: Grade) {
    if (!card || busy) return;
    setBusy(true);

    if (!navigator.onLine) {
      // No connection — remember the grade and carry on studying.
      await queueReview(card.id, g);
      setPending((p) => p + 1);
      setBusy(false);
    } else {
      const res = await fetch("/api/flashcards/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      });
      setBusy(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        push(j.error || "Could not save that review.", "error");
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (j.points > 0) push(`+${j.points} reward point${j.points === 1 ? "" : "s"} 🪙`, "success");
    }

    setDone((d) => d + 1);
    setFlipped(false);

    // "Again" puts the card back at the end of today's queue.
    if (g === "again") {
      setQueue((q) => [...q.slice(0, i), ...q.slice(i + 1), card]);
    } else {
      setQueue((q) => [...q.slice(0, i), ...q.slice(i + 1)]);
    }
    setI((n) => (n >= queue.length - 1 ? 0 : n));

    if (queue.length === 1 && g !== "again") {
      setCelebrate((c) => c + 1);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Confetti fire={celebrate > 0} key={celebrate} />

      {(offline || pending > 0) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-gold/40 bg-gold-pale px-4 py-2.5 text-[13px] font-semibold text-ink/70">
          <Icon name="download" className="h-4 w-4 flex-shrink-0 text-gold-deep" />
          {offline
            ? <span>You&apos;re offline — keep studying, your reviews will sync when you&apos;re back.</span>
            : <span>{pending} review{pending === 1 ? "" : "s"} waiting to sync…</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/portal/flashcards" className="text-sm font-bold text-gold-deep hover:underline">← All decks</Link>
          <h1 className="mt-1 font-display text-2xl font-semibold">{deck.title}</h1>
          <p className="text-sm text-ink/50">{deck.subject || "General"} · {totalCards} card{totalCards === 1 ? "" : "s"} in deck</p>
        </div>
        <span className="rounded-full bg-chalk px-3 py-1.5 text-sm font-bold text-ink/60">
          {finished ? `${done} reviewed` : `${queue.length} left today`}
        </span>
      </div>

      {finished ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="checkCircle" className="h-7 w-7" />
          </span>
          <h2 className="font-display text-xl font-bold">All caught up! 🎉</h2>
          <p className="max-w-sm text-sm text-ink/55">
            {done > 0 ? `You reviewed ${done} card${done === 1 ? "" : "s"}. ` : ""}
            Come back tomorrow — the cards you found hard will return sooner than the easy ones.
          </p>
          <Link href="/portal/flashcards" className="btn-gold mt-2">Back to decks</Link>
        </div>
      ) : (
        <>
          <button onClick={() => setFlipped((f) => !f)}
            className="card neu-card flex min-h-[240px] w-full flex-col items-center justify-center gap-3 p-8 text-center transition hover:shadow-lift">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink/35">
              {flipped ? "Answer" : "Question"}
            </span>
            <p className="whitespace-pre-wrap font-display text-xl font-bold leading-relaxed text-ink">
              {flipped ? card.back : card.front}
            </p>
            {!flipped && <span className="mt-2 text-[12px] font-semibold text-gold-deep">Tap to reveal</span>}
          </button>

          {flipped ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button key={g.key} onClick={() => grade(g.key)} disabled={busy}
                  className={`rounded-xl px-3 py-3 text-center font-bold transition disabled:opacity-50 ${g.cls}`}>
                  <span className="block text-sm">{g.label}</span>
                  <span className="block text-[11px] font-semibold opacity-70">{g.hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => setFlipped(true)} className="btn-gold w-full !min-h-[48px]">Show answer</button>
          )}
        </>
      )}
    </div>
  );
}
