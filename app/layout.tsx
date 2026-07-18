import type { Metadata, Viewport } from "next";
import { Poppins, Fira_Code } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import StructuredData from "@/components/StructuredData";
import InstallPrompt from "@/components/InstallPrompt";
import { siteBaseUrl } from "@/lib/siteUrl";

// Search-engine ownership verification (Google Search Console / Bing). Each is
// only emitted when its env var is set, so no blank tags appear before setup.
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;
const verification = {
  ...(googleVerification ? { google: googleVerification } : {}),
  ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
};

const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400","500","600","700","800"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: "D-Maths Tuition Centre — Online Maths, Science & Coding Tuition",
  description:
    "A virtual learning community for students across Nigeria — expert online tuition in maths, sciences & coding, with exam prep for WAEC, JAMB, IGCSE, SAT & A-Levels.",
  keywords: [
    "online tuition Nigeria",
    "virtual tutoring Nigeria",
    "IGCSE maths tutor",
    "SAT prep Nigeria",
    "A-Level maths tutor",
    "WAEC JAMB preparation",
    "coding classes for students",
    "science tutor online",
    "D-Maths Tuition Centre",
  ],
  openGraph: {
    title: "D-Maths Tuition Centre — Online Maths, Science & Coding Tuition",
    description: "A virtual learning community for students across Nigeria — online tuition in maths, sciences & coding, with prep for WAEC, JAMB, IGCSE, SAT & A-Levels. Live classes and a results-focused portal.",
    url: "/",
    siteName: "D-Maths Tuition Centre",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "D-Maths Tuition Centre" }],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D-Maths Tuition Centre — Online Maths, Science & Coding Tuition",
    description: "A virtual learning community for students across Nigeria — maths, sciences & coding, with prep for WAEC, JAMB, IGCSE, SAT & A-Levels.",
    images: ["/api/og"],
  },
  alternates: { canonical: "/" },
  ...(Object.keys(verification).length ? { verification } : {}),
  // Installable-app (PWA) hints. The manifest link is emitted automatically
  // from app/manifest.ts; these add the iOS home-screen behaviour + icon.
  applicationName: "D-Maths",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "D-Maths" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A60AB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${fira.variable}`}>
      <body>
        <ToastProvider>{children}<CookieBanner /></ToastProvider>
        <InstallPrompt />
        <StructuredData />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
