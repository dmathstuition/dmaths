import type { Metadata } from "next";
import { Fraunces, Roboto, Fira_Code } from "next/font/google";
import "./globals.css";


const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto", weight: ["400","500","700","900"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400","500"] });
export const metadata: Metadata = {
  title: "D-Maths Tuition Centre — Excellence in Mathematics",
  description: "World-class online mathematics tuition for JSS & SSS students across Nigeria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${roboto.variable} ${fira.variable}`}>
    </html>
  );
}
