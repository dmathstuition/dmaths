import type { Metadata } from "next";
import { Poppins, Fira_Code } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400","500","600","700","800"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://dmaths.vercel.app"),
  title: "D-Maths Tuition Centre — Excellence in Mathematics",
  description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
  openGraph: {
    title: "D-Maths Tuition Centre — Excellence in Mathematics",
    description: "World-class online mathematics tuition for JSS & SSS students across Nigeria. Live video sessions, personalised feedback, and a portal built for results.",
    url: "/",
    siteName: "D-Maths Tuition Centre",
    images: [{ url: "/dmathslogo.png", width: 512, height: 512, alt: "D-Maths Tuition Centre" }],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "D-Maths Tuition Centre — Excellence in Mathematics",
    description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
    images: ["/dmathslogo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${fira.variable}`}>
      <body><ToastProvider>{children}<CookieBanner /></ToastProvider></body>
    </html>
  );
}
