import FlashcardsClient from "@/components/admin/FlashcardsClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminFlashcardsPage() {
  const supa = supabaseServer();
  const [{ data: decks }, { data: cards }] = await Promise.all([
    supa.from("flashcard_decks").select("id, title, subject, published, created_at").order("created_at", { ascending: false }),
    supa.from("flashcards").select("id, deck_id, front, back").order("created_at"),
  ]);
  return <FlashcardsClient decks={(decks ?? []) as any[]} cards={(cards ?? []) as any[]} />;
}
