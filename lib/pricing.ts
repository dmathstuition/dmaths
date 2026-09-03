// ── D-MATHS HOURLY TUITION PRICING — single source of truth ──────────
// The per-hour rates for continuing (termly/monthly) tuition. These power
// BOTH the public /pricing page and the attendance-based monthly billing, so
// a rate is only ever edited here.
//
// USD is shown alongside naira for international families; NGN is what
// Paystack actually charges. Rate ₦1,500/$1, matching the summer-camp page.

export const NGN_PER_USD = 1500;

export type PricingTier = {
  id: string;
  name: string;
  // One-line description of who the tier is for.
  blurb: string;
  // What the rate covers — shown as chips on the card.
  covers: string[];
  ngnPerHour: number;
  highlight?: boolean;
};

// The three continuing-tuition tiers. `id` is stable — it is stored on a class
// (class.rate_tier) to pick the hourly rate for attendance billing.
export const PRICING_TIERS: PricingTier[] = [
  {
    id: "standard",
    name: "Core subjects",
    blurb: "Live online tuition in the core academic subjects.",
    covers: ["Maths", "English", "Science"],
    ngnPerHour: 18000,
  },
  {
    id: "ks2",
    name: "KS2 exam prep",
    blurb: "Focused preparation for KS2 examinations.",
    covers: ["KS2 exam technique", "Past-paper practice", "Targeted revision"],
    ngnPerHour: 20000,
    highlight: true,
  },
  {
    id: "coding",
    name: "Coding included",
    blurb: "Any class that includes coding — Python, web & AI.",
    covers: ["Maths / Science", "Python & Web dev", "A.I & Automation"],
    ngnPerHour: 25000,
  },
];

// Everything a learner (and their parent) gets from the portal at any tier —
// the "benefits to enjoy" shown on the pricing page.
export const PORTAL_BENEFITS: string[] = [
  "Live, interactive online classes — never pre-recorded",
  "Personal progress dashboard with grades, attendance & streaks",
  "Unlimited CBT practice tests and timed mock exams",
  "AI homework help and instant photo-answer marking",
  "Revision flashcards and a daily task to keep momentum",
  "Certificates and termly report cards, downloadable as PDF",
  "Leaderboards, rewards and games that make practice stick",
  "A parent portal to follow every child's progress",
  "WhatsApp support and reminders so nothing is missed",
  "Pay securely from the portal — invoices and receipts built in",
];

export const findTier = (id: string | null | undefined): PricingTier | undefined =>
  id ? PRICING_TIERS.find((t) => t.id === id) : undefined;

// The hourly rate for a tier id, falling back to the core-subjects rate for an
// unknown/unset tier so billing never multiplies by zero by accident.
export const ratePerHour = (tierId: string | null | undefined): number =>
  findTier(tierId)?.ngnPerHour ?? PRICING_TIERS[0].ngnPerHour;

// Display helpers. NGN is exact; USD is derived and rounded to whole cents.
export const fmtNgn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
export const usdFromNgn = (ngn: number) => Math.round((ngn / NGN_PER_USD) * 100) / 100;
export const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
