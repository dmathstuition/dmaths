import type { Metadata } from "next";

// /login is a client component, so its SEO metadata lives here in a layout.
export const metadata: Metadata = {
  title: "Sign in — D-Maths Tuition Centre",
  description:
    "Sign in to your D-Maths portal to access live classes, assignments, grades and progress.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
