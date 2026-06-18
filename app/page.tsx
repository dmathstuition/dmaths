import Link from "next/link";
import Logo from "@/components/Logo";
import { HeroStudy, AgencyAnalytics, DotsScatter } from "@/components/illustrations";

const SERVICES = [
  { t: "Algebra & Calculus", d: "From linear equations to derivatives and integrals, built step by step.", c: "#EFAE56", sym: "ƒ(x)" },
  { t: "Exam Preparation", d: "Focused BECE, WASSCE and university entrance coaching that delivers.", c: "#1A60AB", sym: "★" },
  { t: "Python Challenge", d: "Programming fundamentals and our hands-on Python Practice Challenge.", c: "#7BA3CA", sym: ">_" },
  { t: "Statistics & More", d: "Data, probability, geometry and physics across every level.", c: "#EFAE56", sym: "σ" },
];

const STEPS = [
  { t: "Register", d: "Submit the enrolment form to get started in minutes." },
  { t: "We verify", d: "Your details and payment are confirmed, usually within 24 hours." },
  { t: "Get access", d: "Your Student ID and password arrive by email." },
  { t: "Start learning", d: "Join live classes and watch your progress climb." },
];

const TESTIMONIALS = [
  { n: "Joseph Victor", r: "SSS 2 student", t: "D-Maths transformed my understanding of calculus. I went from failing to 91% in three months." },
  { n: "Mrs Adetunji", r: "Parent", t: "My daughter's confidence in mathematics has improved remarkably. The feedback is incredible." },
  { n: "Alli Abdulsamod", r: "Undergraduate", t: "D-Maths prepared me exceptionally well for my entrance exams. I credit them for my distinction." },
];

export default function Landing() {
  return (
    <main className="overflow-hidden bg-white font-body text-ink">
      {/* NAV */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="hidden gap-1 md:flex">
            {[["#services","Services"],["#how","How it works"],["#agency","About"],["#results","Results"],["#contact","Contact"]].map(([h,l]) => (
              <a key={h} href={h} className="rounded-full px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-chalk hover:text-ink">{l}</a>
            ))}
          </div>
          <Link href="/apply" className="btn-gold !min-h-[40px] !rounded-full !px-5">Sign up</Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative pt-28 pb-16">
        <DotsScatter className="pointer-events-none absolute left-6 top-28 h-24 w-24 opacity-70" />
        <DotsScatter className="pointer-events-none absolute right-10 bottom-10 h-20 w-20 opacity-50" />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 md:grid-cols-2">
          <div className="reveal reveal-1">
            <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              We create <span className="text-gold-deep">solutions</span> for your success
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/55">
              Our tutors keep a keen eye on every student's progress to ensure mathematics
              becomes a strength — through live classes, personalised feedback and a portal built for results.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/apply" className="btn-gold !min-h-[50px] !rounded-full !px-7 !text-base">Get started</Link>
              <a href="#how" className="group flex items-center gap-3 text-sm font-semibold text-ink/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white shadow-sm transition group-hover:border-gold">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#1A60AB" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Explore more
              </a>
            </div>
          </div>
          <div className="reveal reveal-2 relative">
            <HeroStudy className="w-full" />
          </div>
        </div>
      </header>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">We Provide The Best <span className="text-gold-deep">Services</span></h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">Unleash the full potential of every student with our subject expertise.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(s => (
            <div key={s.t} className="hovlift group rounded-3xl border border-line bg-white p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-xl font-bold text-white shadow-lg" style={{ background: s.c }}>{s.sym}</div>
              <h3 className="font-display text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PEACH "SIMPLE SOLUTIONS" BAND — process */}
      <section id="how" className="relative my-8">
        <div className="mx-auto max-w-6xl px-5">
          <div className="rounded-[2.5rem] bg-gold-pale px-6 py-14 sm:px-12">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div className="reveal reveal-1">
                <AgencyAnalytics className="w-full max-w-sm" />
              </div>
              <div>
                <h2 className="font-display text-3xl font-bold md:text-4xl">Simple <span className="text-gold-deep">Solutions!</span></h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  We understand that no two students learn alike. That's why we take the time to
                  understand each learner and build a path that works.
                </p>
                <ol className="mt-7 space-y-4">
                  {STEPS.map((s, i) => (
                    <li key={s.t} className="flex items-start gap-4">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-white">{i+1}</span>
                      <div>
                        <p className="font-display font-bold text-ink">{s.t}</p>
                        <p className="text-[13px] text-ink/55">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/apply" className="btn-gold !rounded-full !px-6">Get started</Link>
                  <Link href="/login" className="btn !rounded-full border border-gold/50 bg-white !px-6 text-gold-deep hover:bg-white/60">Read more</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AGENCY / ABOUT */}
      <section id="agency" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="reveal reveal-1 order-2 md:order-1">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Our <span className="text-gold-deep">Centre</span></h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/55">
              We believe in the power of personalised teaching. Our approach lets us make informed
              decisions and optimise each student's learning for maximum results. Let's turn effort
              into achievement — tailored mathematics tuition for every learner.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[["200+","Students"],["98%","Pass rate"],["6","Expert tutors"]].map(([v,l]) => (
                <div key={l} className="rounded-2xl bg-chalk p-4 text-center">
                  <div className="font-display text-2xl font-extrabold text-ink">{v}</div>
                  <div className="mt-1 text-[11px] font-semibold text-ink/45">{l}</div>
                </div>
              ))}
            </div>
            <Link href="/apply" className="btn-gold mt-7 inline-flex !rounded-full !px-6">Read more</Link>
          </div>
          <div className="reveal reveal-2 order-1 md:order-2">
            <AgencyAnalytics className="w-full" />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="results" className="bg-chalk py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">What <span className="text-gold-deep">Clients</span> Say!</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">See how D-Maths has helped students achieve their goals.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <figure key={t.n} className="hovlift rounded-3xl border border-line bg-white p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold font-display font-bold text-white">
                    {t.n.split(" ").map(w=>w[0]).slice(0,2).join("")}
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{t.n}</p>
                    <p className="text-xs text-ink/45">{t.r}</p>
                  </div>
                </div>
                <blockquote className="mt-4 text-[13px] leading-relaxed text-ink/60">{t.t}</blockquote>
                <div className="mt-4 text-gold">{"★".repeat(5)}</div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-center justify-between gap-5 rounded-[2rem] bg-gold-pale px-8 py-8 sm:flex-row">
          <p className="font-display text-2xl font-bold text-ink">Ready to get started?</p>
          <Link href="/apply" className="btn-gold !rounded-full !px-8 !text-base">Apply now</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="relative bg-white pt-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-10 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink/50">
              World-class online mathematics education for JSS and SSS students across Nigeria.
            </p>
          </div>
          <FooterCol title="Centre" links={[["About","#agency"],["Services","#services"],["Results","#results"],["Apply","/apply"]]} />
          <FooterCol title="Learn" links={[["Login","/login"],["How it works","#how"],["Python Challenge","/apply"]]} />
          <FooterCol title="Legal" links={[["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Refund Policy","/refunds"]]} />
        </div>
        <div className="bg-gold py-4 text-center text-xs font-semibold text-white">
          © {new Date().getFullYear()} D-Maths Tuition Centre · dmathstuition@gmail.com · Asaba, Delta State
        </div>
      </footer>
    </main>
  );
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-bold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2 text-[13px] text-ink/55">
        {links.map(([l,h]) => <li key={l}><Link href={h} className="hover:text-gold-deep">{l}</Link></li>)}
      </ul>
    </div>
  );
}
