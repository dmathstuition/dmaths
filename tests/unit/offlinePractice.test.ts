import { describe, it, expect } from "vitest";
import { drainList, type QueuedResult } from "@/lib/offlinePractice";

const round = (id: string, at: number): QueuedResult => ({ id, at, subject: "", level: "", responses: [{ id: "q", chosen: 0 }] });

describe("drainList", () => {
  it("posts every round, clears each, and sums the points", async () => {
    const cleared: string[] = [];
    const res = await drainList(
      [round("a", 1), round("b", 2)],
      async (r) => ({ ok: true, points: r.id === "a" ? 6 : 4 }),
      async (id) => { cleared.push(id); },
    );
    expect(res).toEqual({ synced: 2, remaining: 0, points: 10 });
    expect(cleared).toEqual(["a", "b"]);
  });

  it("stops at the first failure and leaves the rest queued", async () => {
    const cleared: string[] = [];
    const res = await drainList(
      [round("a", 1), round("b", 2), round("c", 3)],
      async (r) => (r.id === "b" ? { ok: false } : { ok: true, points: 2 }),
      async (id) => { cleared.push(id); },
    );
    expect(res.synced).toBe(1);
    expect(res.remaining).toBe(2);
    expect(res.points).toBe(2);
    expect(cleared).toEqual(["a"]); // b failed → b and c stay queued
  });

  it("handles an empty queue", async () => {
    const res = await drainList([], async () => ({ ok: true }), async () => {});
    expect(res).toEqual({ synced: 0, remaining: 0, points: 0 });
  });
});
