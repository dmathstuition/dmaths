import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { cleanCardBatch, type CardDraft } from "@/lib/flashcardDraft";

// Staff create a revision deck (optionally publishing it to all learners) and
// add cards to it. Deletion cascades to the deck's cards.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const action = String(payload?.action ?? "");
  const admin = supabaseAdmin();

  const explain = (m: string) =>
    /relation .*flashcard/i.test(m) ? "Flashcards need migration-flashcards.sql — run it in Supabase." : m;

  // Admins manage every deck; a tutor may only touch decks they created.
  const ownsDeck = async (deckId: string) => {
    if (staff.role === "admin") return true;
    const { data } = await admin.from("flashcard_decks").select("owner_id").eq("id", deckId).maybeSingle();
    return data?.owner_id === staff.id;
  };

  if (action === "deck") {
    const title = String(payload?.title ?? "").trim().slice(0, 120);
    const subject = String(payload?.subject ?? "").trim().slice(0, 60);
    if (!title) return NextResponse.json({ error: "A deck title is required." }, { status: 400 });
    const { data, error } = await admin.from("flashcard_decks")
      .insert({ title, subject, owner_id: staff.id, published: !!payload?.published }).select().single();
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, deck: data });
  }

  if (action === "card") {
    const deckId = String(payload?.deckId ?? "");
    const front = String(payload?.front ?? "").trim().slice(0, 500);
    const back = String(payload?.back ?? "").trim().slice(0, 500);
    if (!deckId || !front || !back) {
      return NextResponse.json({ error: "A deck, a question and an answer are required." }, { status: 400 });
    }
    if (!(await ownsDeck(deckId))) return NextResponse.json({ error: "That deck isn't yours." }, { status: 403 });
    const { error } = await admin.from("flashcards").insert({ deck_id: deckId, front, back });
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Save many cards at once — used by "Add all" after the A.I drafts a set. The
  // drafts are re-validated and de-duped server-side, so nothing malformed lands
  // in the deck even if the client sends junk.
  if (action === "cards") {
    const deckId = String(payload?.deckId ?? "");
    if (!deckId) return NextResponse.json({ error: "deckId required" }, { status: 400 });
    if (!(await ownsDeck(deckId))) return NextResponse.json({ error: "That deck isn't yours." }, { status: 403 });
    const cards = cleanCardBatch((payload?.cards ?? []) as Partial<CardDraft>[]);
    if (!cards.length) return NextResponse.json({ error: "No usable cards to add." }, { status: 400 });
    const { error } = await admin.from("flashcards").insert(cards.map((c) => ({ deck_id: deckId, front: c.front, back: c.back })));
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, added: cards.length });
  }

  if (action === "publish") {
    const deckId = String(payload?.deckId ?? "");
    if (!deckId) return NextResponse.json({ error: "deckId required" }, { status: 400 });
    if (!(await ownsDeck(deckId))) return NextResponse.json({ error: "That deck isn't yours." }, { status: 403 });
    const { error } = await admin.from("flashcard_decks").update({ published: !!payload?.published }).eq("id", deckId);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const deckId = url.searchParams.get("deckId");
  const cardId = url.searchParams.get("cardId");
  const admin = supabaseAdmin();
  const ownsDeck = async (deckId: string) => {
    if (staff.role === "admin") return true;
    const { data } = await admin.from("flashcard_decks").select("owner_id").eq("id", deckId).maybeSingle();
    return data?.owner_id === staff.id;
  };
  if (cardId) {
    const { data: card } = await admin.from("flashcards").select("deck_id").eq("id", cardId).maybeSingle();
    if (card && !(await ownsDeck(card.deck_id))) {
      return NextResponse.json({ error: "That card isn't yours." }, { status: 403 });
    }
    const { error } = await admin.from("flashcards").delete().eq("id", cardId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (deckId) {
    if (!(await ownsDeck(deckId))) return NextResponse.json({ error: "That deck isn't yours." }, { status: 403 });
    const { error } = await admin.from("flashcard_decks").delete().eq("id", deckId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "deckId or cardId required" }, { status: 400 });
}
