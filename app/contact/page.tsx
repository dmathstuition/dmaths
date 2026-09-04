import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";

export const metadata = {
  title: "Contact — D-Maths Tuition",
  description: "Get in touch with D-Maths Tuition Centre by email or WhatsApp, or register your child online.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHeader eyebrow="Contact" title="Get in touch"
        lead="Questions about programmes, pricing or getting started? We're happy to help." />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <a href="mailto:support@dmaths.academy" className="rounded-2xl border border-line bg-white p-6 transition hover:border-gold/50 hover:shadow-sm">
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Email</p>
            <p className="mt-2 font-display text-base font-bold text-ink">support@dmaths.academy</p>
            <p className="mt-1 text-[13px] text-ink/55">We reply within 24 hours.</p>
          </a>
          <a href="https://wa.me/2347025674894" target="_blank" rel="noopener noreferrer"
            className="rounded-2xl border border-line bg-white p-6 transition hover:border-gold/50 hover:shadow-sm">
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">WhatsApp</p>
            <p className="mt-2 font-display text-base font-bold text-ink">+234 70 2567 4894</p>
            <p className="mt-1 text-[13px] text-ink/55">Chat with our team directly.</p>
          </a>
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink/40">Centre</p>
            <p className="mt-2 font-display text-base font-bold text-ink">Asaba, Delta State</p>
            <p className="mt-1 text-[13px] text-ink/55">Fully online — study from anywhere in Nigeria.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-3xl bg-board px-8 py-10 text-center sm:flex-row sm:px-12 sm:text-left">
          <div>
            <p className="font-display text-2xl font-bold text-white">Ready to enrol?</p>
            <p className="mt-1.5 text-sm text-white/60">Register online in a few minutes — no payment needed to start.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/apply" className="btn-gold !min-h-[48px] !rounded-full !px-7">Register now</Link>
            <Link href="/pricing" className="btn !min-h-[48px] !rounded-full border border-white/25 bg-white/10 !px-6 text-white hover:bg-white/15">View pricing</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
