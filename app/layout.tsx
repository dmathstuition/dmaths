import type { Metadata } from "next";
import { Poppins, Fira_Code } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/react";
import { siteBaseUrl } from "@/lib/siteUrl";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400","500","600","700","800"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: "D-Maths Tuition Centre — Excellence in Mathematics",
  description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
  openGraph: {
    title: "D-Maths Tuition Centre — Excellence in Mathematics",
    description: "World-class online mathematics tuition for JSS & SSS students across Nigeria. Live video sessions, personalised feedback, and a portal built for results.",
    url: "/",
    siteName: "D-Maths Tuition Centre",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "D-Maths Tuition Centre" }],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D-Maths Tuition Centre — Excellence in Mathematics",
    description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${fira.variable}`}>
      <body>
        <ToastProvider>{children}<CookieBanner /></ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
