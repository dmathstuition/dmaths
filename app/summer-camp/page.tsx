import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import Reveal from "@/components/landing/Reveal";
import { DotsScatter } from "@/components/illustrations";
import {
  SUMMER_CAMP,
  SUMMER_CAMP_TIERS,
  fmtUsd,
  fmtNgn,
} from "@/lib/summerCamp";

export const metadata: Metadata = {
  title: "Summer Camp — D-Maths Online",
  description:
    "D-Maths Online Summer Camp: hands-on Maths & Coding for the full summer break. Foundation maths, coding, game development, AI, web development and Python — with a personalized portal to track every learner's growth.",
  openGraph: {
    title: "D-Maths Online Summer Camp",
    description:
      "Hands-on Maths & Coding for the full summer break. Registration is open.",
  },
};

const INCLUDED = [
  "Mathematics Foundation Challenge",
  "Foundation Mathematics",
  "Coding",
  "Game Development",
  "Artificial Intelligence",
  "Web Development",
  "Python",
];

const TRACK_LABEL: Record<string, string> = {
  maths: "Maths",
  coding: "Coding",
  both: "Maths + Coding",
};

export default function SummerCamp() {
  return (
    <main className="overflow-hidden bg-white font-body text-ink">
      {/* Lightweight header */}
      <header className="bg-board px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <Link href="/login" className="text-sm font-semibold text-white/55 hover:text-white">
            Already enrolled? Sign in
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="boardgrid relative bg-board pb-20 pt-16 text-white">
        <DotsScatter className="pointer-events-none absolute left-6 top-20 h-24 w-24 opacity-30" />
        <DotsScatter className="pointer-events-none absolute right-10 bottom-10 h-20 w-20 opacity-20" />
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Registration is open
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              D-Maths Online <span className="text-gold">Summer Camp</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/70 md:text-base">
              Hands-on <strong className="text-white">Maths &amp; Coding</strong> for the{" "}
              <strong className="text-white">full two-month summer break</strong>. Live online
              sessions, real projects, and a personalized portal so you can track every learner's
              growth — all summer long.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a href="#packages" className="btn-gold !min-h-[50px] !rounded-full !px-7 !text-base">
                See packages
              </a>
              <Link
                href={`/apply?camp=${SUMMER_CAMP.season}`}
                className="btn !min-h-[50px] !rounded-full border border-white/30 bg-white/5 !px-7 !text-base text-white hover:bg-white/10"
              >
                Register now →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            What you'll <span className="text-gold-deep">learn</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink/50">
            A summer of building real skills — from a strong mathematics foundation to writing your
            first programs, games and AI projects.
          </p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((item, i) => (
            <Reveal key={item} delay={i * 60}>
              <div className="hovlift flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-deep">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="text-sm font-semibold text-ink/75">{item}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="bg-chalk py-16">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mb-3 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Choose your <span className="text-gold-deep">package</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink/50">
              One flat price for the entire summer break. Pick a track and reserve your place —
              prices shown in USD with the naira amount you'll be charged.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMER_CAMP_TIERS.map((t, i) => (
              <Reveal key={t.id} delay={i * 70}>
                <div
                  className={`hovlift relative flex h-full flex-col rounded-3xl border bg-white p-6 ${
                    t.highlight ? "border-gold shadow-lg ring-1 ring-gold/30" : "border-line"
                  }`}
                >
                  {t.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow">
                      Best value
                    </span>
                  )}
                  <span className="self-start rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep">
                    {TRACK_LABEL[t.track]}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug">{t.name}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink/55">{t.blurb}</p>

                  <div className="mt-5 border-t border-line pt-4">
                    <p className="font-display text-3xl font-extrabold text-ink">{fmtUsd(t.usd)}</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink/45">
                      {fmtNgn(t.ngn)} · whole summer
                    </p>
                  </div>

                  <Link
                    href={`/apply?camp=${SUMMER_CAMP.season}&plan=${t.id}`}
                    className="btn-gold mt-5 w-full !rounded-full"
                  >
                    Register →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-lg text-center text-xs text-ink/40">
            Payment is processed in naira (₦) at ₦{SUMMER_CAMP.ngnPerUsd.toLocaleString("en-NG")} to
            $1. After you register and your payment is verified, your Student ID and portal login
            arrive by email.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-5 rounded-[2rem] bg-gold-pale px-8 py-8 sm:flex-row">
            <div>
              <p className="font-display text-2xl font-bold text-ink">Ready for a summer of growth?</p>
              <p className="mt-1 text-sm text-ink/55">
                100% online — learn from home, anywhere. Limited places per group.
              </p>
            </div>
            <Link
              href={`/apply?camp=${SUMMER_CAMP.season}`}
              className="btn-gold !rounded-full !px-8 !text-base"
            >
              Register now
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="bg-white pt-4">
        <div className="bg-gold py-4 text-center text-xs font-semibold text-white">
          © {new Date().getFullYear()} D-Maths Tuition Centre · dmathstuition@gmail.com · Asaba, Delta State
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a
        href="https://wa.me/2347025674894"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition hover:scale-110 hover:shadow-2xl"
        style={{ background: "#25D366" }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.524 5.843L.057 23.572a.5.5 0 0 0 .609.61l5.802-1.519A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 0 1-5.045-1.378l-.361-.214-3.742.981.999-3.65-.235-.374A9.9 9.9 0 0 1 2.1 12C2.1 6.534 6.534 2.1 12 2.1S21.9 6.534 21.9 12 17.466 21.9 12 21.9z" />
        </svg>
      </a>
    </main>
  );
}
