import { ratePerHour } from "@/lib/pricing";

// ── D-MATHS ENROLMENT PACKAGES — single source of truth ──────────────
// Learners enrol by choosing ONE package (not loose subjects). Each package
// maps to an hourly billing tier in lib/pricing.ts, so the rate stays defined
// in one place. Editing this list changes the sign-up form and the learner's
// dashboard together.

export type PackageId = "tier1" | "tier2" | "tier3";

export type EnrolPackage = {
  id: PackageId;
  name: string;          // e.g. "Tier 1"
  tagline: string;       // short subtitle
  rateTier: "standard" | "ks2" | "coding"; // billing rate (see lib/pricing)
  includedSubjects: string[];              // always part of the package
  selectableSubjects?: string[];           // choose-from pool (Tier 2)
  maxSelectable?: number;                  // cap on the pool
  bullets: string[];                       // selling points on the card
};

export const PACKAGES: EnrolPackage[] = [
  {
    id: "tier1",
    name: "Tier 1 — Core Subjects",
    tagline: "Maths, English & Science",
    rateTier: "standard",
    includedSubjects: ["Maths", "English", "Science"],
    bullets: ["Live tuition in Maths, English & Science", "Weekly homework with feedback", "Progress tracked in the portal"],
  },
  {
    id: "tier2",
    name: "Tier 2 — KS2 & KS3 Exam Prep",
    tagline: "Exam preparation · up to 3 subjects",
    rateTier: "ks2",
    includedSubjects: [],
    selectableSubjects: ["Maths", "English", "Science", "Verbal Reasoning", "Non-verbal Reasoning"],
    maxSelectable: 3,
    bullets: ["Focused KS2 & KS3 exam preparation", "Choose up to 3 subjects", "Past-paper practice & exam technique"],
  },
  {
    id: "tier3",
    name: "Tier 3 — Core + Coding",
    tagline: "Tier 1 plus coding",
    rateTier: "coding",
    includedSubjects: ["Maths", "English", "Science", "Coding"],
    bullets: ["Everything in Tier 1", "Plus coding — Python, web & A.I", "Project-based, future-ready skills"],
  },
];

export const findPackage = (id: string | null | undefined): EnrolPackage | undefined =>
  id ? PACKAGES.find((p) => p.id === id) : undefined;

export const isPackageId = (id: string | null | undefined): boolean => !!findPackage(id);

// The subjects a learner ends up with for a package. For a choose-from package
// (Tier 2), this is the picked subjects (filtered to the pool and capped);
// otherwise it's the package's fixed subjects.
export function packageSubjects(pkg: EnrolPackage, selected: string[] = []): string[] {
  if (pkg.selectableSubjects && pkg.selectableSubjects.length) {
    const pool = new Set(pkg.selectableSubjects);
    const picked = selected.filter((s) => pool.has(s));
    const cap = pkg.maxSelectable ?? picked.length;
    return [...pkg.includedSubjects, ...picked.slice(0, cap)];
  }
  return [...pkg.includedSubjects];
}

// Naira/hour for a package, via its billing tier.
export const packageRate = (pkg: EnrolPackage): number => ratePerHour(pkg.rateTier);

// The package label to show on the learner's dashboard from a stored id.
export const packageLabel = (id: string | null | undefined): string => findPackage(id)?.name ?? "";
