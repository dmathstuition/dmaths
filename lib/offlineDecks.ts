// Offline revision: keeps a learner's flashcard decks and any grades made while
// disconnected in IndexedDB on their own device.
//
// Why not the service worker? app/sw.ts deliberately marks /portal and /api as
// NetworkOnly so private data is never written to the shared HTTP cache. That
// rule must stay — so offline support lives here instead, in per-browser
// storage that belongs to the signed-in learner.

export type OfflineCard = { id: string; front: string; back: string };
export type QueuedReview = { cardId: string; grade: string; at: number };

const DB_NAME = "dmaths-offline";
const DB_VERSION = 1;
const DECKS = "decks";
const QUEUE = "reviewQueue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DECKS)) db.createObjectStore(DECKS, { keyPath: "deckId" });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "cardId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(store, mode).objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  }));
}

// Every helper degrades to a no-op rather than throwing — offline support must
// never break the online experience (private mode, quota, old browsers…).
const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

export function saveDeck(deckId: string, cards: OfflineCard[]): Promise<boolean> {
  return safe(tx(DECKS, "readwrite", (s) => s.put({ deckId, cards, savedAt: Date.now() })).then(() => true), false);
}

export function getDeck(deckId: string): Promise<OfflineCard[] | null> {
  return safe(
    tx<any>(DECKS, "readonly", (s) => s.get(deckId)).then((row) => (row?.cards as OfflineCard[]) ?? null),
    null,
  );
}

// Which decks this device already holds a copy of (drives the "Offline ✓" chip).
export function savedDeckIds(): Promise<string[]> {
  return safe(
    tx<IDBValidKey[]>(DECKS, "readonly", (s) => s.getAllKeys()).then((keys) => (keys ?? []).map(String)),
    [],
  );
}

// Keyed by cardId, so re-grading the same card offline replaces the earlier
// grade rather than queuing it twice.
export function queueReview(cardId: string, grade: string): Promise<boolean> {
  return safe(tx(QUEUE, "readwrite", (s) => s.put({ cardId, grade, at: Date.now() })).then(() => true), false);
}

export function pendingReviews(): Promise<QueuedReview[]> {
  return safe(
    tx<any[]>(QUEUE, "readonly", (s) => s.getAll()).then((rows) =>
      (rows ?? []).slice().sort((a, b) => a.at - b.at) as QueuedReview[]),
    [],
  );
}

export function clearReview(cardId: string): Promise<boolean> {
  return safe(tx(QUEUE, "readwrite", (s) => s.delete(cardId)).then(() => true), false);
}

// The drain loop, with its two dependencies handed in. Kept separate from
// drainQueue so the contract that matters — send oldest first, clear only what
// the server accepted, stop at the first failure — is testable without a
// browser or a fake IndexedDB.
export async function drainList(
  queued: QueuedReview[],
  post: (r: QueuedReview) => Promise<boolean>,
  clear: (cardId: string) => Promise<unknown>,
): Promise<{ synced: number; remaining: number }> {
  let synced = 0;
  for (const r of queued) {
    const ok = await post(r);
    if (!ok) break;
    await clear(r.cardId);
    synced++;
  }
  return { synced, remaining: queued.length - synced };
}

// Push queued grades to the server, clearing each only after it is accepted, so
// a failure mid-way leaves the rest queued for the next attempt.
export async function drainQueue(
  post: (r: QueuedReview) => Promise<boolean>,
): Promise<{ synced: number; remaining: number }> {
  return drainList(await pendingReviews(), post, clearReview);
}
