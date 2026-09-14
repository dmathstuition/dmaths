import type { Metadata } from "next";

// /apply is a client component, so its SEO metadata lives here in a layout.
export const metadata: Metadata = {
  title: "Register — Novelia Academy",
  description:
    "Enrol in Novelia online maths, science & coding tuition. Quick registration for learners worldwide — live classes, exam prep (WAEC, JAMB, IGCSE, SAT, A-Levels) and a progress portal.",
  alternates: { canonical: "/apply" },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
