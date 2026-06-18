import type { Metadata } from "next";
import { Poppins, Fira_Code } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/Toast";

const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400","500","600","700","800"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });

export const metadata: Metadata = {
  title: "D-Maths Tuition Centre — Excellence in Mathematics",
  description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${fira.variable}`}>
      <body><ToastProvider>{children}<CookieBanner /></ToastProvider></body>
    </html>
  );
}
