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

  // A.I draft state, scoped to the deck it was generated for.
  const [aiForm, setAiForm] = useState({ topic: "", count: 8 });
  const [aiBusy, setAiBusy] = useState(false);
  const [drafts, setDrafts] = useState<{ front: string; back: string }[] | null>(null);
  const [draftsDeck, setDraftsDeck] = useState<string | null>(null);

  async function aiGenerate(d: Deck) {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: d.subject || d.title, topic: aiForm.topic, count: aiForm.count }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { push(j.error || "The A.I couldn't draft cards.", "error"); return; }
      setDrafts(j.cards ?? []);
      setDraftsDeck(d.id);
    } finally { setAiBusy(false); }
  }

  function editDraft(i: number, side: "front" | "back", value: string) {
    setDrafts((ds) => ds ? ds.map((c, j) => (j === i ? { ...c, [side]: value } : c)) : ds);
  }
  function dropDraft(i: number) {
    setDrafts((ds) => ds ? ds.filter((_, j) => j !== i) : ds);
  }

  async function addAllDrafts(deckId: string) {
    if (!drafts?.length) return;
    setBusy(true);
    const j = await call({ action: "cards", deckId, cards: drafts });
    setBusy(false);
    if (!j) return;
    push(`Added ${j.added} card${j.added === 1 ? "" : "s"}.`, "success");
    setDrafts(null); setDraftsDeck(null); setAiForm({ topic: "", count: 8 });
    router.refresh();
  }

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
                  {!deckCards.length && <p className="text-sm text-ink/40">No cards yet — draft some with the A.I or add one below.</p>}

                  <div className="rounded-xl border border-gold/30 bg-gold-pale/40 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Icon name="sparkles" className="h-4 w-4 text-gold-deep" /> Draft cards with A.I
                    </p>
                    <p className="mt-0.5 text-xs text-ink/55">For <strong>{d.subject || d.title}</strong> — review and edit before adding.</p>
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <label htmlFor={`ai-topic-${d.id}`} className="flabel">Topic (optional)</label>
                        <input id={`ai-topic-${d.id}`} className="field" value={aiForm.topic} onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })} placeholder="e.g. Simultaneous equations" />
                      </div>
                      <div className="w-24">
                        <label htmlFor={`ai-count-${d.id}`} className="flabel">How many</label>
                        <input id={`ai-count-${d.id}`} type="number" min={1} max={12} className="field" value={aiForm.count} onChange={(e) => setAiForm({ ...aiForm, count: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} />
                      </div>
                      <button className="btn-gold !rounded-xl" onClick={() => aiGenerate(d)} disabled={aiBusy}>
                        {aiBusy ? "Drafting…" : "Draft cards"}
                      </button>
                    </div>

                    {draftsDeck === d.id && drafts && (
                      <div className="mt-4 space-y-2">
                        {!drafts.length && <p className="text-sm text-ink/50">No drafts left — generate again.</p>}
                        {drafts.map((c, i) => (
                          <div key={i} className="grid gap-2 rounded-lg bg-white/70 p-3 sm:grid-cols-2">
                            <textarea className="field min-h-[56px] text-sm" value={c.front} onChange={(e) => editDraft(i, "front", e.target.value)} />
                            <div className="flex items-start gap-2">
                              <textarea className="field min-h-[56px] flex-1 text-sm" value={c.back} onChange={(e) => editDraft(i, "back", e.target.value)} />
                              <button onClick={() => dropDraft(i)} className="mt-1 flex-shrink-0 text-xs font-bold text-red-500 hover:underline">Drop</button>
                            </div>
                          </div>
                        ))}
                        {!!drafts.length && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button className="btn-ink !rounded-xl" onClick={() => addAllDrafts(d.id)} disabled={busy}>Add all {drafts.length} to deck</button>
                            <button className="btn-ghost !rounded-xl" onClick={() => { setDrafts(null); setDraftsDeck(null); }}>Discard</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

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
