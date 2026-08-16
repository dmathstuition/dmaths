// Shared shape + validation for flashcards, so a card the AI drafts and a card a
// teacher types are held to the same rule before they reach the deck. Pure and
// server/client-safe (used by the AI route, the batch-insert route and tests).

export type CardDraft = { front: string; back: string };

export const MAX_CARD_LEN = 500;

// A card is usable only if both sides carry text. Returns the reason so the UI
// can say it; null means good.
export function validateCard(c: Partial<CardDraft>): string | null {
  if (!String(c.front ?? "").trim()) return "Every card needs a question on the front.";
  if (!String(c.back ?? "").trim()) return "Every card needs an answer on the back.";
  return null;
}

// Trim and clamp both sides before storing, matching the column limits.
export function normaliseCard(c: Partial<CardDraft>): CardDraft {
  return {
    front: String(c.front ?? "").trim().slice(0, MAX_CARD_LEN),
    back: String(c.back ?? "").trim().slice(0, MAX_CARD_LEN),
  };
}

// Clean a batch of drafts: normalise, drop the malformed, de-dupe by front text
// so the AI repeating itself doesn't litter the deck. Pure so it's testable.
export function cleanCardBatch(raw: Partial<CardDraft>[]): CardDraft[] {
  const seen = new Set<string>();
  const out: CardDraft[] = [];
  for (const r of raw ?? []) {
    const card = normaliseCard(r);
    if (validateCard(card) !== null) continue;
    const key = card.front.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(card);
  }
  return out;
}
