import { describe, it, expect, vi } from "vitest";
import {
  drainList,
  drainQueue,
  saveDeck,
  getDeck,
  queueReview,
  pendingReviews,
  type QueuedReview,
} from "@/lib/offlineDecks";

describe("offlineDecks — graceful degradation", () => {
  it("never throws when IndexedDB is unavailable (SSR / private mode)", async () => {
    // jsdom here has no indexedDB — every helper must resolve, not reject,
    // because offline support must never break the online experience.
    await expect(saveDeck("d1", [{ id: "c1", front: "a", back: "b" }])).resolves.toBe(false);
    await expect(getDeck("d1")).resolves.toBeNull();
    await expect(queueReview("c1", "good")).resolves.toBe(false);
    await expect(pendingReviews()).resolves.toEqual([]);
  });

  it("drainQueue reports nothing to sync when there is no stored queue", async () => {
    const post = vi.fn(async () => true);
    await expect(drainQueue(post)).resolves.toEqual({ synced: 0, remaining: 0 });
    expect(post).not.toHaveBeenCalled();
  });
});

// The drain contract is the part that must not lose a learner's work:
// send oldest first, clear only what the server accepted, keep the rest queued.
describe("drainList", () => {
  const queued: QueuedReview[] = [
    { cardId: "c1", grade: "good", at: 1 },
    { cardId: "c2", grade: "hard", at: 2 },
    { cardId: "c3", grade: "easy", at: 3 },
  ];

  it("clears everything when all posts succeed, oldest first", async () => {
    const cleared: string[] = [];
    const sent: string[] = [];
    const res = await drainList(
      queued,
      async (r) => { sent.push(r.cardId); return true; },
      async (id) => { cleared.push(id); },
    );
    expect(res).toEqual({ synced: 3, remaining: 0 });
    expect(sent).toEqual(["c1", "c2", "c3"]);
    expect(cleared).toEqual(["c1", "c2", "c3"]);
  });

  it("stops at the first failure and leaves the rest queued", async () => {
    const cleared: string[] = [];
    const post = vi.fn<(r: QueuedReview) => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const res = await drainList(queued, post, async (id) => { cleared.push(id); });

    expect(res).toEqual({ synced: 1, remaining: 2 });
    expect(cleared).toEqual(["c1"]);          // c2 failed, so it stays queued
    expect(post).toHaveBeenCalledTimes(2);    // never tried c3
  });

  it("never clears a review the server rejected", async () => {
    const cleared: string[] = [];
    const res = await drainList(queued, async () => false, async (id) => { cleared.push(id); });
    expect(res).toEqual({ synced: 0, remaining: 3 });
    expect(cleared).toEqual([]);
  });

  it("does nothing on an empty queue", async () => {
    const post = vi.fn(async () => true);
    await expect(drainList([], post, async () => {})).resolves.toEqual({ synced: 0, remaining: 0 });
    expect(post).not.toHaveBeenCalled();
  });
});
