import Link from "next/link";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";
import OfflineChip from "@/components/portal/OfflineChip";
import { supabaseServer } from "@/lib/supabase/server";
import { isDue } from "@/lib/srs";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const supa = supabaseServer();

  // RLS shows published decks; reviews are the learner's own.
  const [{ data: decks }, { data: cards }, { data: reviews }] = await Promise.all([
    supa.from("flashcard_decks").select("id, title, subject").order("created_at", { ascending: false }),
    supa.from("flashcards").select("id, deck_id"),
    supa.from("flashcard_reviews").select("card_id, due_on"),
  ]);

  const dueByCard = new Map((reviews ?? []).map((r: any) => [r.card_id, r.due_on]));
  const stats = new Map<string, { total: number; due: number }>();
  for (const c of cards ?? []) {
    const s = stats.get(c.deck_id) ?? { total: 0, due: 0 };
    s.total++;
    if (isDue(dueByCard.get(c.id))) s.due++;
    stats.set(c.deck_id, s);
  }

  const list = (decks ?? []).map((d: any) => ({ ...d, ...(stats.get(d.id) ?? { total: 0, due: 0 }) }));
  const totalDue = list.reduce((a: number, d: any) => a + d.due, 0);

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="book" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Revision cards</h1>
          <p className="mt-1 text-sm text-white/50">
            {totalDue > 0 ? `${totalDue} card${totalDue === 1 ? "" : "s"} ready to review today.` : "Practise with spaced repetition — the cards you find hard come back sooner."}
          </p>
        </div>
      </div>

      {list.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((d: any, i: number) => (
            <Reveal key={d.id} delay={i * 60}>
              <Link href={`/portal/flashcards/${d.id}`} className="card neu-card card-interactive flex h-full items-center gap-4 p-5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                  <Icon name="book" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-ink">{d.title}</p>
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-ink/50">
                    <span>{d.subject || "General"} · {d.total} card{d.total === 1 ? "" : "s"}</span>
                    <OfflineChip deckId={d.id} />
                  </p>
                </div>
                {d.due > 0 ? (
                  <span className="flex-shrink-0 rounded-full bg-gold px-2.5 py-1 text-[11px] font-extrabold text-board">{d.due} due</span>
                ) : (
                  <span className="flex-shrink-0 text-emerald-500"><Icon name="checkCircle" /></span>
                )}
              </Link>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 py-14 text-ink/40">
          <Icon name="book" className="h-8 w-8" />
          <p className="text-sm">No revision decks yet — your tutor will publish some soon.</p>
        </div>
      )}
    </div>
  );
}
