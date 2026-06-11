import type { Metadata } from "next";
import { Fraunces, Nunito_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito", weight: ["400","600","700","800","900"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });

export const metadata: Metadata = {
  title: "D-Maths Tuition Centre — Excellence in Mathematics",
  description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} ${fira.variable}`}>
      <body>{children}</body>
    </html>
  );
}
