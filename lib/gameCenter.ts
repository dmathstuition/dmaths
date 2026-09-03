import type { IconName } from "@/components/Icons";

// ── D-MATHS GAME CENTER — single source of truth ─────────────────────
// The Game Center (/portal/games) is the learner's arcade: every game,
// challenge, competition and reward in one place, kept separate from the
// classes/attendance/reports side of the portal.
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  ✏️  TO ADD / REMOVE / RE-ORDER A GAME, EDIT THE LIST BELOW.       │
// │  • Add an entry to GAME_CENTER with a `group` from GAME_GROUPS.    │
// │  • `status: "new"` shows a NEW ribbon; `status: "soon"` shows it   │
// │    as a locked “coming soon” tile (no link needed yet).            │
// │  • The game keeps living at its own route (`href`) — this file      │
// │    just gathers them into one beautiful hub.                       │
// │  Commit the change on GitHub and the site redeploys in ~a minute.  │
// └──────────────────────────────────────────────────────────────────┘

export type GameStatus = "live" | "new" | "soon";

export type GameEntry = {
  id: string;
  title: string;
  blurb: string;
  href: string;        // where the game lives today ("" is fine for status:"soon")
  icon: IconName;
  accent: string;      // hex accent for the tile
  group: (typeof GAME_GROUPS)[number];
  status?: GameStatus; // omit for a normal live tile
};

// Section headings, shown in this order. Add a new one here to open a new shelf.
export const GAME_GROUPS = ["Arcade", "Compete", "Rewards & style", "Labs & maps"] as const;

export const GAME_CENTER: GameEntry[] = [
  // ── Arcade — quick single-player games & challenges ──
  { id: "sprint", title: "Math Sprint", blurb: "Race the clock through rapid-fire questions.", href: "/portal/sprint", icon: "star", accent: "#EFAE56", group: "Arcade" },
  { id: "boss", title: "Boss Battle", blurb: "Team up to take down this week's boss.", href: "/portal/boss", icon: "flame", accent: "#E5484D", group: "Arcade" },
  { id: "mathle", title: "Mathle", blurb: "A new number puzzle to crack every day.", href: "/portal/mathle", icon: "grid", accent: "#2F9E68", group: "Arcade" },
  { id: "duel", title: "Quiz Duel", blurb: "Go head-to-head with another learner.", href: "/portal/duel", icon: "zap", accent: "#7C5CFC", group: "Arcade" },
  { id: "focus", title: "Focus Mode", blurb: "Beat distraction with focused study sprints.", href: "/portal/focus", icon: "target", accent: "#1A60AB", group: "Arcade" },

  // ── Compete — climb the boards ──
  { id: "leagues", title: "Leagues", blurb: "Win your weekly division and get promoted.", href: "/portal/leagues", icon: "trophy", accent: "#EFAE56", group: "Compete" },
  { id: "leaderboard", title: "Leaderboard", blurb: "See who's topping the school this season.", href: "/portal/leaderboard", icon: "crown", accent: "#C8881F", group: "Compete" },

  // ── Rewards & style — spend and show off ──
  { id: "badges", title: "Badges", blurb: "Collect badges for every milestone you hit.", href: "/portal/badges", icon: "medal", accent: "#EFAE56", group: "Rewards & style" },
  { id: "shop", title: "Rewards Shop", blurb: "Spend reward points on perks and power-ups.", href: "/portal/shop", icon: "gift", accent: "#2F9E68", group: "Rewards & style" },
  { id: "style", title: "Avatar Studio", blurb: "Customise your avatar and show your title.", href: "/portal/style", icon: "sparkles", accent: "#7C5CFC", group: "Rewards & style" },

  // ── Labs & maps — playgrounds and progression ──
  { id: "skills", title: "Knowledge Map", blurb: "Unlock topics as your skills grow.", href: "/portal/skills", icon: "mapPin", accent: "#1A60AB", group: "Labs & maps" },
  { id: "math-lab", title: "Math Lab", blurb: "Experiment with maths, hands-on.", href: "/portal/math-lab", icon: "flask", accent: "#7BA3CA", group: "Labs & maps" },
  { id: "code", title: "Code Playground", blurb: "Write and run real code in your browser.", href: "/portal/code", icon: "code", accent: "#0E7C86", group: "Labs & maps" },
];

// The games grouped in GAME_GROUPS order, each group keeping its list order.
export function gamesByGroup(): { group: string; games: GameEntry[] }[] {
  return GAME_GROUPS
    .map((group) => ({ group, games: GAME_CENTER.filter((g) => g.group === group) }))
    .filter((s) => s.games.length > 0);
}

// Count of games that are actually playable now (everything except "soon").
export const liveGameCount = () => GAME_CENTER.filter((g) => g.status !== "soon").length;
