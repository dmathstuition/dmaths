"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Deck = { id: string; title: string; subject: string | null; published: boolean };
type Card = { id: string; deck_id: string; front: string; back: string };

export default function FlashcardsClient({ decks, cards }: { decks: Deck[]; cards: Card[] }) {
  const router = useRouter();
  const push = useToast();
  const [deckForm, setDeckForm] = useState({ title: "", subject: "", published: true });
  const [openId, setOpenId] = useState<string | null>(decks[0]?.id ?? null);
  const [cardForm, setCardForm] = useState({ front: "", back: "" });
  const [busy, setBusy] = useState(false);

  async function call(body: any) {
    const res = await fetch("/api/flashcards", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Something went wrong.", "error"); return null; }
    return j;
  }

  async function createDeck() {
    if (!deckForm.title.trim()) { push("Give the deck a title.", "error"); return; }
    setBusy(true);
    const j = await call({ action: "deck", ...deckForm });
    setBusy(false);
    if (!j) return;
    push("Deck created.", "success");
    setDeckForm({ title: "", subject: "", published: true });
    setOpenId(j.deck?.id ?? null);
    router.refresh();
  }

  async function addCard(deckId: string) {
    if (!cardForm.front.trim() || !cardForm.back.trim()) { push("A question and an answer are required.", "error"); return; }
    setBusy(true);
    const j = await call({ action: "card", deckId, ...cardForm });
    setBusy(false);
    if (!j) return;
    setCardForm({ front: "", back: "" });
    push("Card added.", "success");
    router.refresh();
  }

  async function togglePublish(d: Deck) {
    await call({ action: "publish", deckId: d.id, published: !d.published });
    push(d.published ? "Deck hidden from learners." : "Deck published to learners.", "success");
    router.refresh();
  }

  async function remove(params: string, label: string) {
    if (!confirm(`Delete this ${label}?`)) return;
    const res = await fetch(`/api/flashcards?${params}`, { method: "DELETE" });
    if (!res.ok) { push(`Could not delete the ${label}.`, "error"); return; }
    push(`${label[0].toUpperCase()}${label.slice(1)} deleted.`, "success");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="book" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Revision cards</h1>
          <p className="mt-1 text-sm text-white/50">Build decks learners revise with spaced repetition.</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">New deck</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="flashc-title" className="flabel">Title</label>
            <input id="flashc-title" className="field" value={deckForm.title} onChange={(e) => setDeckForm({ ...deckForm, title: e.target.value })} placeholder="e.g. Quadratic equations" />
          </div>
          <div>
            <label htmlFor="flashc-subject" className="flabel">Subject</label>
            <input id="flashc-subject" className="field" value={deckForm.subject} onChange={(e) => setDeckForm({ ...deckForm, subject: e.target.value })} placeholder="Maths" />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink/70">
          <input type="checkbox" checked={deckForm.published} onChange={(e) => setDeckForm({ ...deckForm, published: e.target.checked })} />
          Publish to learners straight away
        </label>
        <button className="btn-gold mt-4" onClick={createDeck} disabled={busy}>Create deck</button>
      </div>

      <div className="space-y-3">
        {decks.map((d) => {
          const deckCards = cards.filter((c) => c.deck_id === d.id);
          const open = openId === d.id;
          return (
            <div key={d.id} className="card neu-card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
                <button onClick={() => setOpenId(open ? null : d.id)} className="min-w-0 flex-1 text-left">
                  <p className="font-display text-base font-bold text-ink">{d.title}</p>
                  <p className="text-xs text-ink/50">{d.subject || "General"} · {deckCards.length} card{deckCards.length === 1 ? "" : "s"}</p>
                </button>
                <button onClick={() => togglePublish(d)}
                  className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${d.published ? "bg-emerald-50 text-emerald-700" : "bg-chalk text-ink/50"}`}>
                  {d.published ? "Published" : "Hidden"}
                </button>
                <button onClick={() => remove(`deckId=${d.id}`, "deck")} className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Delete</button>
              </div>

              {open && (
                <div className="space-y-3 p-5">
                  {deckCards.map((c) => (
                    <div key={c.id} className="flex items-start gap-3 rounded-xl bg-chalk/60 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">{c.front}</p>
                        <p className="mt-0.5 text-[13px] text-ink/60">{c.back}</p>
                      </div>
                      <button onClick={() => remove(`cardId=${c.id}`, "card")} className="flex-shrink-0 text-xs font-bold text-red-500 hover:underline">Remove</button>
                    </div>
                  ))}
                  {!deckCards.length && <p className="text-sm text-ink/40">No cards yet — add the first one below.</p>}

                  <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="flashc-question-front" className="flabel">Question (front)</label>
                      <textarea id="flashc-question-front" className="field min-h-[70px]" value={cardForm.front} onChange={(e) => setCardForm({ ...cardForm, front: e.target.value })} placeholder="What is the quadratic formula?" />
                    </div>
                    <div>
                      <label htmlFor="flashc-answer-back" className="flabel">Answer (back)</label>
                      <textarea id="flashc-answer-back" className="field min-h-[70px]" value={cardForm.back} onChange={(e) => setCardForm({ ...cardForm, back: e.target.value })} placeholder="x = (−b ± √(b²−4ac)) / 2a" />
                    </div>
                  </div>
                  <button className="btn-ink" onClick={() => addCard(d.id)} disabled={busy}>Add card</button>
                </div>
              )}
            </div>
          );
        })}
        {!decks.length && <p className="card p-6 text-center text-sm text-ink/40">No decks yet — create your first above.</p>}
      </div>
    </div>
  );
}
