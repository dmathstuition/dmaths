import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";
import { PRICING_TIERS, PORTAL_BENEFITS, NGN_PER_USD, fmtNgn, fmtUsd, usdFromNgn } from "@/lib/pricing";

export const metadata = {
  title: "Pricing — D-Maths Tuition",
  description: "Simple per-hour tuition — Maths, English & Science, KS2 exam prep, and coding. Billed monthly from attendance and paid securely in the portal.",
  alternates: { canonical: "/pricing" },
};

const BILLING = [
  { n: "1", t: "Attend your classes", d: "Every live session is recorded in the portal, with its length in hours." },
  { n: "2", t: "Hours add up", d: "Attended hours are totalled automatically for the month — no manual counting." },
  { n: "3", t: "Bill 3 days before month-end", d: "Hours × your rate becomes the month's invoice, sent to the parent before the month is over." },
  { n: "4", t: "Pay from the portal", d: "Pay securely from your own portal — the receipt is issued instantly." },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHeader eyebrow="Pricing" title="Pay only for the hours you learn"
        lead="Tuition is charged per hour. Attendance is tracked automatically, totalled each month, and the bill is sent to the parent three days before the month ends — payable securely in the portal." />

      {/* Pricing cards */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {PRICING_TIERS.map((t) => (
            <div key={t.id} className={`glass-card relative flex h-full flex-col !rounded-3xl p-7 ${t.highlight ? "ring-2 ring-gold" : ""}`}>
              {t.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">Popular</span>
              )}
              <h2 className="font-display text-xl font-bold text-ink">{t.name}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{t.blurb}</p>
              <div className="mt-5">
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-ink">{fmtNgn(t.ngnPerHour)}</span>
                  <span className="pb-1 text-sm font-semibold text-ink/45">/ hour</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-gold-deep">≈ {fmtUsd(usdFromNgn(t.ngnPerHour))} / hour</p>
              </div>
              <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                {t.covers.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-[13.5px] text-ink/70">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
              <Link href="/apply" className={`mt-7 inline-flex items-center justify-center !rounded-full !px-6 ${t.highlight ? "btn-gold" : "btn border border-gold/50 bg-white text-gold-deep hover:bg-gold-pale"}`}>
                Register
              </Link>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[13px] text-ink/45">
          Rates are per hour of live tuition. USD is shown as a guide at ₦{NGN_PER_USD.toLocaleString("en-NG")}/$1; all payments are charged in naira.
        </p>
      </section>

      {/* How billing works */}
      <section className="border-y border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-ink md:text-3xl">How billing works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BILLING.map((s) => (
              <div key={s.n} className="glass-card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-white">{s.n}</span>
                <h3 className="mt-4 font-display text-base font-bold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal benefits */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="rounded-3xl bg-board px-6 py-12 sm:px-12">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">Every plan includes the full portal</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">The same learning tools, whatever you study.</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-4xl gap-x-8 gap-y-3.5 sm:grid-cols-2">
            {PORTAL_BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                <span className="text-[14px] leading-relaxed text-white/80">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-line bg-chalk/50 px-8 py-10 text-center sm:flex-row sm:px-12 sm:text-left">
          <div>
            <p className="font-display text-2xl font-bold text-ink">Ready to start learning?</p>
            <p className="mt-1.5 text-sm text-ink/55">Register in minutes — 100% online, anywhere in Nigeria.</p>
          </div>
          <Link href="/apply" className="btn-gold !min-h-[48px] !rounded-full !px-8">Register now</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
