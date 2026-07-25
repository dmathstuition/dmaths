import FlashcardsClient from "@/components/admin/FlashcardsClient";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TutorFlashcardsPage() {
  const user = await getUser();
  const uid = user?.id ?? "";
  const admin = supabaseAdmin();

  // Only the decks this tutor created — the API enforces the same ownership.
  const { data: decks } = await admin.from("flashcard_decks")
    .select("id, title, subject, published, created_at").eq("owner_id", uid)
    .order("created_at", { ascending: false });

  const ids = (decks ?? []).map((d: any) => d.id);
  const { data: cards } = ids.length
    ? await admin.from("flashcards").select("id, deck_id, front, back").in("deck_id", ids).order("created_at")
    : { data: [] as any[] };

  return <FlashcardsClient decks={(decks ?? []) as any[]} cards={(cards ?? []) as any[]} />;
}
