import type { Metadata } from "next";

// /apply is a client component, so its SEO metadata lives here in a layout.
export const metadata: Metadata = {
  title: "Register — D-Maths Tuition Centre",
  description:
    "Enrol in D-Maths online maths, science & coding tuition. Quick registration for learners across Nigeria — live classes, exam prep (WAEC, JAMB, IGCSE, SAT, A-Levels) and a progress portal.",
  alternates: { canonical: "/apply" },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
