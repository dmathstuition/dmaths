import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Reveal from "@/components/landing/Reveal";
import { PRICING_TIERS, PORTAL_BENEFITS, NGN_PER_USD, fmtNgn, fmtUsd, usdFromNgn } from "@/lib/pricing";

export const metadata = {
  title: "Pricing · D-Maths",
  description: "Simple per-hour tuition — Maths, English & Science, KS2 exam prep, and coding. Billed monthly from your attendance and paid securely in the portal.",
};

export default function PricingPage() {
  return (
    <main className="overflow-hidden bg-white font-body text-ink">
      <a href="#plans" className="skip-link">Skip to pricing</a>
      <LandingNav />

      {/* HERO */}
      <header className="relative pt-28 pb-10">
        <div className="mesh-premium pointer-events-none absolute inset-x-0 -top-24 h-[34rem]" />
        <div className="relative mx-auto max-w-4xl px-5 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white px-4 py-1.5 text-xs font-bold text-gold-deep">
              <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-gold-deep" /> Simple per-hour pricing
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Pay only for the <span className="text-gradient-gold">hours you learn</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink/55">
              Tuition is charged per hour. Your attendance is tracked automatically in the portal, added
              up each month, and the bill is sent to your parent three days before the month ends —
              payable securely right from your portal.
            </p>
          </Reveal>
        </div>
      </header>

      {/* PRICING CARDS */}
      <section id="plans" className="mx-auto max-w-6xl px-5 pb-6">
        <div className="grid gap-5 md:grid-cols-3">
          {PRICING_TIERS.map((t, i) => (
            <Reveal key={t.id} delay={i * 90}>
              <div className={`card-premium relative flex h-full flex-col rounded-3xl p-7 ${
                t.highlight ? "ring-2 ring-gold shadow-xl" : ""}`}>
                {t.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                    Popular
                  </span>
                )}
                <h2 className="font-display text-xl font-bold">{t.name}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{t.blurb}</p>

                <div className="mt-5">
                  <div className="flex items-end gap-1.5">
                    <span className="font-display text-4xl font-extrabold text-ink">{fmtNgn(t.ngnPerHour)}</span>
                    <span className="pb-1 text-sm font-semibold text-ink/45">/ hour</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gold-deep">≈ {fmtUsd(usdFromNgn(t.ngnPerHour))} / hour</p>
                </div>

                <ul className="mt-5 space-y-2.5 border-t border-line/70 pt-5">
                  {t.covers.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-[13.5px] text-ink/70">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>

                <Link href="/apply" className={`mt-7 inline-flex items-center justify-center gap-1.5 !rounded-full !px-6 ${
                  t.highlight ? "btn-gold" : "btn border border-gold/50 bg-white text-gold-deep hover:bg-gold-pale"}`}>
                  Get started <span aria-hidden>→</span>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] text-ink/45">
          Rates are per hour of live tuition. USD is shown as a guide at ₦{NGN_PER_USD.toLocaleString("en-NG")}/$1;
          all payments are charged in naira.
        </p>
      </section>

      {/* HOW BILLING WORKS */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <Reveal className="mb-9 text-center">
          <h2 className="font-display text-3xl font-bold">How <span className="text-gold-deep">billing</span> works</h2>
          <span className="bar-animate mx-auto mt-3 block h-1 w-16 rounded-full bg-gradient-to-r from-gold to-gold-deep" />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "1", t: "Attend your classes", d: "Every live session you attend is recorded in the portal, with its length in hours." },
            { n: "2", t: "Hours add up", d: "Your attended hours are totalled automatically for the month — no manual counting." },
            { n: "3", t: "Bill 3 days before month-end", d: "Hours × your rate becomes the month's invoice, sent to your parent before the month is over." },
            { n: "4", t: "Pay from the portal", d: "Pay securely in a tap from your own portal — the receipt is issued instantly." },
          ].map((s) => (
            <Reveal key={s.n}>
              <div className="card h-full rounded-2xl p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold font-display text-lg font-bold text-white shadow-sm">{s.n}</span>
                <h3 className="mt-4 font-display font-bold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PORTAL BENEFITS */}
      <section className="relative my-6">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mesh-dark relative overflow-hidden rounded-[2.5rem] px-6 py-14 shadow-2xl sm:px-14">
            <div className="relative text-center">
              <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Everything the <span className="text-gradient-gold">portal</span> gives you</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">Every plan includes the full D-Maths learning portal — the same tools, whatever you study.</p>
            </div>
            <div className="relative mx-auto mt-10 grid max-w-4xl gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {PORTAL_BENEFITS.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[14px] leading-relaxed text-white/80">{b}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Reveal>
          <div className="mesh-dark group relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-[2rem] px-8 py-10 shadow-2xl sm:flex-row sm:px-12">
            <div className="relative text-center sm:text-left">
              <p className="font-display text-2xl font-bold text-white md:text-3xl">Ready to start learning?</p>
              <p className="mt-1.5 text-sm text-white/60">Sign up in minutes — 100% online, anywhere in Nigeria.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/apply" className="btn-gold inline-flex items-center gap-1.5 !rounded-full !px-8 !text-base shadow-lg shadow-gold/30 transition hover:scale-105">
                Apply now <span aria-hidden>→</span>
              </Link>
              <Link href="/" className="btn !rounded-full border border-white/25 bg-white/10 !px-6 text-white hover:bg-white/15">
                Back to home
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
