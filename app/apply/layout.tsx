import type { Metadata } from "next";

// /apply is a client component, so its SEO metadata lives here in a layout.
export const metadata: Metadata = {
  title: "Register — D-Maths Tuition Centre",
  description:
    "Enrol in D-Maths online maths & coding tuition. Quick registration for JSS & SSS students across Nigeria — live classes, exam prep (BECE/WASSCE) and a progress portal.",
  alternates: { canonical: "/apply" },
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
