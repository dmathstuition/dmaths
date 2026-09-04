import type { ReactNode } from "react";
import LandingNav from "@/components/landing/LandingNav";
import MarketingFooter from "@/components/landing/MarketingFooter";
import ChatWidget from "@/components/landing/ChatWidget";

// Shared frame for every public marketing page: the branded nav on top, the
// page content, the footer, and the help chatbot.
export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-body text-ink">
      <a href="#main" className="skip-link">Skip to main content</a>
      <LandingNav />
      <main id="main" tabIndex={-1} className="pt-16">{children}</main>
      <MarketingFooter />
      <ChatWidget />
    </div>
  );
}

// A consistent page header for interior marketing pages (About, Programmes…).
export function PageHeader({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <section className="border-b border-line bg-chalk/40">
      <div className="mx-auto max-w-6xl px-5 py-14 text-center sm:py-16">
        {eyebrow && <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold-deep">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {lead && <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/55">{lead}</p>}
      </div>
    </section>
  );
}
