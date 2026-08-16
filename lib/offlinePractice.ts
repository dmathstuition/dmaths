// Offline practice: download a few rounds while online, play them with no
// connection, and queue the answers to be graded + rewarded once back online.
//
// Mirrors lib/offlineDecks.ts: per-device IndexedDB (never the shared HTTP
// cache, so /portal + /api stay NetworkOnly and private). Crucially, the answer
// KEY is never stored — only the questions to show and the learner's responses —
// so grading and reward stay server-authoritative on sync, exactly like online.

export type OfflineQuestion = { id: string; question: string; code?: string; image_url?: string; options: string[] };
export type SavedRound = { id: string; questions: OfflineQuestion[]; subject: string; level: string; savedAt: number };
export type QueuedResult = { id: string; responses: { id: string; chosen: number }[]; subject: string; level: string; at: number };

const DB_NAME = "dmaths-offline-practice";
const DB_VERSION = 1;
const ROUNDS = "rounds";
const QUEUE = "resultQueue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ROUNDS)) db.createObjectStore(ROUNDS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id" });
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

// Every helper degrades to a no-op — offline support must never break the online
// experience (private mode, quota, old browsers…).
const safe = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

export function saveRound(round: SavedRound): Promise<boolean> {
  return safe(tx(ROUNDS, "readwrite", (s) => s.put(round)).then(() => true), false);
}

export function listSavedRounds(): Promise<SavedRound[]> {
  return safe(
    tx<any[]>(ROUNDS, "readonly", (s) => s.getAll()).then((rows) =>
      (rows ?? []).slice().sort((a, b) => a.savedAt - b.savedAt) as SavedRound[]),
    [],
  );
}

export function deleteRound(id: string): Promise<boolean> {
  return safe(tx(ROUNDS, "readwrite", (s) => s.delete(id)).then(() => true), false);
}

// Keyed by the round id, so re-submitting the same round replaces rather than
// duplicating its queued result.
export function queueResult(r: QueuedResult): Promise<boolean> {
  return safe(tx(QUEUE, "readwrite", (s) => s.put(r)).then(() => true), false);
}

export function pendingResults(): Promise<QueuedResult[]> {
  return safe(
    tx<any[]>(QUEUE, "readonly", (s) => s.getAll()).then((rows) =>
      (rows ?? []).slice().sort((a, b) => a.at - b.at) as QueuedResult[]),
    [],
  );
}

export function clearResult(id: string): Promise<boolean> {
  return safe(tx(QUEUE, "readwrite", (s) => s.delete(id)).then(() => true), false);
}

// The drain contract, dependencies handed in so it's testable without a browser:
// send oldest first, clear only what the server accepted, stop at the first
// failure. Returns how many points were credited across the synced rounds.
export async function drainList(
  queued: QueuedResult[],
  post: (r: QueuedResult) => Promise<{ ok: boolean; points?: number }>,
  clear: (id: string) => Promise<unknown>,
): Promise<{ synced: number; remaining: number; points: number }> {
  let synced = 0, points = 0;
  for (const r of queued) {
    const res = await post(r);
    if (!res.ok) break;
    await clear(r.id);
    synced++; points += res.points ?? 0;
  }
  return { synced, remaining: queued.length - synced, points };
}

export async function drainQueue(
  post: (r: QueuedResult) => Promise<{ ok: boolean; points?: number }>,
): Promise<{ synced: number; remaining: number; points: number }> {
  return drainList(await pendingResults(), post, clearResult);
}
