import { describe, it, expect } from "vitest";
import { GAME_CENTER, GAME_GROUPS, gamesByGroup, liveGameCount } from "@/lib/gameCenter";

describe("game center", () => {
  it("has unique ids and a portal href (or is 'soon')", () => {
    const ids = GAME_CENTER.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GAME_CENTER) {
      if (g.status === "soon") continue;
      expect(g.href).toMatch(/^\/portal\//);
    }
  });

  it("every game belongs to a known group", () => {
    for (const g of GAME_CENTER) {
      expect(GAME_GROUPS).toContain(g.group);
    }
  });

  it("gamesByGroup keeps group order and includes every live-listed game", () => {
    const shelves = gamesByGroup();
    const flat = shelves.flatMap((s) => s.games.map((g) => g.id));
    expect(flat.sort()).toEqual(GAME_CENTER.map((g) => g.id).sort());
    // Group headings appear in the declared order.
    const order = shelves.map((s) => s.group);
    expect(order).toEqual([...GAME_GROUPS].filter((grp) => order.includes(grp)));
  });

  it("liveGameCount excludes 'soon' tiles", () => {
    const soon = GAME_CENTER.filter((g) => g.status === "soon").length;
    expect(liveGameCount()).toBe(GAME_CENTER.length - soon);
  });
});
