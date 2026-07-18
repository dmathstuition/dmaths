import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import SocialLinks from "@/components/landing/SocialLinks";
import { DotsScatter } from "@/components/illustrations";
import { Icon, type IconName } from "@/components/Icons";
import PhysicalCampPicker from "@/components/landing/PhysicalCampPicker";
import {
  SUMMER_CAMP,
  SUMMER_CAMP_TIERS,
  PHYSICAL_CAMP,
  CAMP_CURRICULUM,
  DISCOUNT_PCT,
  discountedUsd,
  discountedNgn,
  fmtUsd,
  fmtNgn,
  campDateRange,
  campShortDates,
} from "@/lib/summerCamp";

export const metadata: Metadata = {
  title: "Summer Camp — D-Maths Online",
  alternates: { canonical: "/summer-camp" },
  description: `D-Maths Online Summer Camp (${campDateRange()}): hands-on Maths & Coding. Foundation maths, coding, game development, AI, web development and Python — with a personalized portal to track every learner's growth.`,
  openGraph: {
    title: "D-Maths Online Summer Camp",
    description: `Hands-on Maths & Coding, ${campDateRange()}. Registration is open.`,
  },
};

// Single source of truth — the same modules the apply form fills in per plan.
const INCLUDED = CAMP_CURRICULUM.both;

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
      <section className="boardgrid relative overflow-hidden bg-board pb-20 pt-16 text-white">
        <div className="mesh-dark pointer-events-none absolute inset-0 opacity-80" />
        <DotsScatter className="float pointer-events-none absolute left-6 top-20 h-24 w-24 opacity-30" />
        <DotsScatter className="float pointer-events-none absolute right-10 bottom-10 h-20 w-20 opacity-20 [animation-delay:1.5s]" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <Reveal className="text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                Registration is open
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
                <Icon name="calendar" className="h-4 w-4" /> {campDateRange()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/80">
                <Icon name="mapPin" className="h-4 w-4" /> {PHYSICAL_CAMP.address}
              </span>
            </div>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              D-Maths <span className="text-gradient-gold">Summer Camp</span>
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-white/70 md:text-base">
              Hands-on <strong className="text-white">Maths &amp; Coding</strong>, {campDateRange()}.
              Join us <strong className="text-white">in person at our Asaba centre</strong> — four
              sessions a week — or learn <strong className="text-white">online</strong> from home.
              Real projects, expert tutors and a personalized portal to track every learner's growth.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <a href="#in-person" className="btn-gold inline-flex items-center gap-2 !min-h-[50px] !rounded-full !px-7 !text-base">
                <Icon name="school" className="h-5 w-5" /> In-person (Asaba)
              </a>
              <a href="#packages" className="btn inline-flex items-center gap-2 !min-h-[50px] !rounded-full border border-white/30 bg-white/5 !px-7 !text-base text-white hover:bg-white/10">
                <Icon name="monitor" className="h-5 w-5" /> Learn online
              </a>
            </div>
          </Reveal>

          <Reveal delay={120} className="group relative">
            <div className="hero-glow absolute -inset-6 rounded-[2rem]" />
            <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <Image
                src="/summer-camp-banner.png"
                alt="D-Maths students coding and building projects with the D-Maths robot"
                width={1000}
                height={812}
                quality={90}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-board/50 to-transparent" />
            </div>
            {/* floating badge */}
            <div className="float absolute -left-3 bottom-6 rounded-2xl bg-gold px-4 py-3 shadow-xl">
              <p className="font-display text-lg font-extrabold text-white">{campShortDates()}</p>
              <p className="text-[11px] font-semibold text-white/80">Summer 2026</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* IN-PERSON (ASABA) — featured */}
      <section id="in-person" className="relative overflow-hidden bg-white py-16">
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-gold-pale px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-gold-deep">
                <Icon name="school" className="h-4 w-4" /> New — in-person classes
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-4xl">
                Learn on-site at our <span className="text-gold-deep">Asaba centre</span>
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/60">
                Face-to-face teaching, hands-on projects and a focused classroom — four sessions
                every week, all through the summer break.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: "mapPin" as IconName, t: PHYSICAL_CAMP.venue, d: PHYSICAL_CAMP.address },
                  { icon: "calendar" as IconName, t: PHYSICAL_CAMP.frequency, d: campDateRange() },
                  { icon: "sigma" as IconName, t: "Maths, Coding — or both", d: "Choose the class that fits your child." },
                ].map((r) => (
                  <li key={r.t} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gold-pale text-gold-deep"><Icon name={r.icon} className="h-5 w-5" /></span>
                    <div>
                      <p className="font-display text-sm font-bold text-ink">{r.t}</p>
                      <p className="text-[13px] text-ink/50">{r.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <PhysicalCampPicker />
            </Reveal>
          </div>
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
              <div className="card-premium group flex h-full items-center gap-3 rounded-2xl p-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-deep transition-transform duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-white">
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
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink/50 shadow-sm">
              <Icon name="monitor" className="h-4 w-4" /> Prefer to learn from home?
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">
              Online <span className="text-gold-deep">packages</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-ink/50">
              Live online sessions for the whole camp ({campDateRange()}). Pick a track and reserve
              your place — prices in USD with the naira amount you'll be charged.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMER_CAMP_TIERS.map((t, i) => (
              <Reveal key={t.id} delay={i * 70}>
                <div
                  className={`card-premium group relative flex h-full flex-col rounded-3xl p-6 ${
                    t.highlight ? "!border-gold shadow-lg ring-1 ring-gold/30" : ""
                  }`}
                >
                  {t.highlight && (
                    <span className="badge-pulse absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow">
                      Best value
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep">
                      {TRACK_LABEL[t.track]}
                    </span>
                    {DISCOUNT_PCT > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                        Save {DISCOUNT_PCT}%
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold leading-snug">{t.name}</h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink/55">{t.blurb}</p>

                  <div className="mt-5 border-t border-line pt-4">
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-3xl font-extrabold text-ink">{fmtUsd(discountedUsd(t))}</p>
                      {DISCOUNT_PCT > 0 && (
                        <p className="font-display text-lg font-semibold text-ink/35 line-through">{fmtUsd(t.usd)}</p>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-ink/45">
                      <CountUp to={discountedNgn(t)} prefix="₦" thousands duration={1100} />
                      {DISCOUNT_PCT > 0 && <span className="ml-1.5 text-ink/30 line-through">{fmtNgn(t.ngn)}</span>}
                      {" "}· whole summer
                    </p>
                  </div>

                  <Link
                    href={`/apply?camp=${SUMMER_CAMP.season}&plan=${t.id}`}
                    className="btn-gold mt-5 inline-flex w-full items-center justify-center gap-1.5 !rounded-full"
                  >
                    Register <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-2 text-center text-sm font-semibold text-ink/60">
            <Icon name="payments" className="h-4 w-4 text-gold-deep" /> Prefer to spread it out? <span className="text-gold-deep">Pay half now and the balance later.</span>
          </p>
          <p className="mx-auto mt-2 max-w-lg text-center text-xs text-ink/40">
            Payment is processed in naira (₦) at ₦{SUMMER_CAMP.ngnPerUsd.toLocaleString("en-NG")} to
            $1. After you register and your payment is verified, your Student ID and portal login
            arrive by email.
          </p>
        </div>
      </section>

      {/* HOW TO REGISTER */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <Reveal className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            How to <span className="text-gold-deep">register</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink/50">
            It only takes a few minutes. Here's exactly what happens.
          </p>
        </Reveal>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Choose your package", d: "Pick the track and plan that fits your child best." },
            { t: "Fill the short form", d: "A few details about the learner and their guardian." },
            { t: "Make payment", d: "Securely by card or bank transfer — 20% off applied." },
            { t: "We contact you", d: "Our team reaches out to confirm your place and send your portal login." },
          ].map((s, i) => (
            <Reveal key={s.t} delay={i * 80}>
              <li className="hovlift group card h-full p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-white transition-transform duration-300 group-hover:scale-110">
                  {i + 1}
                </span>
                <p className="mt-3 font-display font-bold text-ink">{s.t}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <Reveal>
          <p className="mx-auto mt-8 max-w-2xl rounded-2xl border border-gold/30 bg-gold-pale px-5 py-4 text-center text-sm font-semibold text-ink/70">
            That's it — once you finish registering, <strong className="text-ink">our team will contact you</strong> to
            confirm everything and get your child started.
          </p>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mesh-dark group relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-[2rem] px-8 py-10 shadow-2xl sm:flex-row sm:px-12">
            <DotsScatter className="float pointer-events-none absolute right-6 top-4 h-16 w-16 opacity-20" />
            <div className="relative text-center sm:text-left">
              <p className="font-display text-2xl font-bold text-white md:text-3xl">Ready for a summer of growth?</p>
              <p className="mt-1.5 text-sm text-white/60">
                In person at Asaba or online from home. Limited places per group.
              </p>
            </div>
            <Link
              href={`/apply?camp=${SUMMER_CAMP.season}`}
              className="btn-gold relative inline-flex items-center gap-1.5 !rounded-full !px-8 !text-base shadow-lg shadow-gold/30 transition hover:scale-105"
            >
              Register now <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="bg-white pt-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 pb-8">
          <p className="text-sm font-semibold text-ink/50">Follow D-Maths</p>
          <SocialLinks className="justify-center" />
        </div>
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
