import { notFound } from "next/navigation";
import StudyDeck from "@/components/portal/StudyDeck";
import { supabaseServer } from "@/lib/supabase/server";
import { isDue } from "@/lib/srs";

export const dynamic = "force-dynamic";

export default async function StudyDeckPage({ params }: { params: { id: string } }) {
  const supa = supabaseServer();
  const { data: deck } = await supa.from("flashcard_decks").select("id, title, subject").eq("id", params.id).maybeSingle();
  if (!deck) notFound();

  const [{ data: cards }, { data: reviews }] = await Promise.all([
    supa.from("flashcards").select("id, front, back").eq("deck_id", params.id).order("created_at"),
    supa.from("flashcard_reviews").select("card_id, due_on"),
  ]);

  const dueByCard = new Map((reviews ?? []).map((r: any) => [r.card_id, r.due_on]));
  const due = (cards ?? []).filter((c: any) => isDue(dueByCard.get(c.id)));

  return <StudyDeck deck={deck as any} cards={due as any} totalCards={(cards ?? []).length} />;
}
