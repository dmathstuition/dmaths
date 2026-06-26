// ── D-MATHS SUMMER CAMP — single source of truth ─────────────────────
// Pricing and metadata shared between the /summer-camp landing page and the
// /apply enrolment form. Change numbers HERE only — both places read from this.
//
// USD is the headline (charm .99). NGN is what Paystack actually charges
// (rate ₦1,500/$1, charm-rounded down to end in ,999).

export const SUMMER_CAMP = {
  season: "summer-2026",
  title: "D-Maths Online Summer Camp",
  // Runs for the full two-month summer break.
  durationLabel: "Full two-month summer break",
  ngnPerUsd: 1500,
} as const;

export type CampTrack = "maths" | "coding" | "both";

export interface CampTier {
  id: string;
  name: string;
  usd: number;   // headline price, e.g. 49.99
  ngn: number;   // amount charged in naira
  track: CampTrack;
  blurb: string;
  highlight?: boolean; // visually feature this card
}

export const SUMMER_CAMP_TIERS: CampTier[] = [
  {
    id: "gen-maths",
    name: "General Mathematics Foundation",
    usd: 19.99,
    ngn: 29999,
    track: "maths",
    blurb: "Group classes building a rock-solid mathematics foundation across the summer.",
  },
  {
    id: "pers-maths",
    name: "Personalized Mathematics Foundational",
    usd: 49.99,
    ngn: 74999,
    track: "maths",
    blurb: "One-focus tutoring tailored to your child's level, pace and weak spots.",
  },
  {
    id: "gen-coding",
    name: "General Coding",
    usd: 19.99,
    ngn: 29999,
    track: "coding",
    blurb: "Group coding classes — Python, web and game-development fundamentals.",
  },
  {
    id: "pers-coding",
    name: "Personalized Coding",
    usd: 69.99,
    ngn: 104999,
    track: "coding",
    blurb: "Tailored coding path — Python, AI, web & game dev at your child's pace.",
  },
  {
    id: "combo",
    name: "General Maths & Coding",
    usd: 49.99,
    ngn: 74999,
    track: "both",
    blurb: "Both tracks in one — maths foundation plus hands-on coding. Best value.",
    highlight: true,
  },
  {
    id: "individual",
    name: "Individual Maths & Coding (1-on-1)",
    usd: 119.99,
    ngn: 179999,
    track: "both",
    blurb: "Fully private 1-on-1 coaching across maths and coding — maximum attention.",
  },
];

export function findTier(id: string | null | undefined): CampTier | undefined {
  if (!id) return undefined;
  return SUMMER_CAMP_TIERS.find((t) => t.id === id);
}

// Display helpers
export const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
export const fmtNgn = (n: number) => `₦${n.toLocaleString("en-NG")}`;
