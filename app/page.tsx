import Link from "next/link";
import Image from "next/image";
import { DotsScatter } from "@/components/illustrations";
import Reveal from "@/components/landing/Reveal";
import CountUp from "@/components/landing/CountUp";
import LandingNav from "@/components/landing/LandingNav";
import SummerCampBanner from "@/components/landing/SummerCampBanner";
import FloatingMath from "@/components/landing/FloatingMath";
import Tilt3D from "@/components/landing/Tilt3D";
import Parallax from "@/components/landing/Parallax";
import FlyerPopup from "@/components/landing/FlyerPopup";
import SocialLinks from "@/components/landing/SocialLinks";
import PortalShowcase from "@/components/landing/PortalShowcase";
import AppLauncher from "@/components/AppLauncher";
import InstallPrompt from "@/components/InstallPrompt";

const SERVICES = [
  { t: "Maths & Calculus", d: "From algebra and geometry to derivatives and integrals, built step by step.", c: "#EFAE56", sym: "ƒ(x)" },
  { t: "Exam Preparation", d: "Focused prep for WAEC, JAMB, IGCSE, SAT & A-Levels that delivers.", c: "#1A60AB", sym: "★" },
  { t: "Coding & Python", d: "Programming fundamentals — Python, web and our hands-on coding challenges.", c: "#7BA3CA", sym: ">_" },
  { t: "Sciences & Statistics", d: "Physics, data, probability and more across every level and curriculum.", c: "#EFAE56", sym: "σ" },
];

const FEATURES = [
  {
    label: "Live video sessions",
    icon: <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></>,
  },
  {
    label: "WhatsApp support",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  },
  {
    label: "Progress dashboard",
    icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  },
  {
    label: "Personalised feedback",
    icon: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
  },
];

const STEPS = [
  { t: "Register", d: "Submit the enrolment form to get started in minutes." },
  { t: "We verify", d: "Your details and payment are confirmed, usually within 24 hours." },
  { t: "Get access", d: "Your Student ID and password arrive by email." },
  { t: "Start learning", d: "Join live video sessions from home and watch your progress climb." },
];

const TESTIMONIALS = [
  { n: "Joseph Victor", r: "SSS 2 student", t: "D-Maths transformed my understanding of calculus. I went from failing to 91% in three months." },
  { n: "Mrs Adetunji", r: "Parent", t: "My daughter's confidence in mathematics has improved remarkably. The feedback is incredible." },
  { n: "Alli Abdulsamod", r: "Undergraduate", t: "D-Maths prepared me exceptionally well for my entrance exams. I credit them for my distinction." },
];

const STATS = [
  { v: 200, suffix: "+", l: "Students" },
  { v: 98,  suffix: "%", l: "Pass rate" },
  { v: 6,   suffix: "",  l: "Expert tutors" },
];

export default function Landing() {
  return (
    <main className="overflow-hidden bg-white font-body text-ink">
      <FlyerPopup />
      <AppLauncher />
      <InstallPrompt />
      <SummerCampBanner />
      <LandingNav />

      {/* HERO */}
      <header className="relative pt-28 pb-16">
        {/* premium gradient mesh + soft animated colour wash behind the hero */}
        <div className="mesh-premium pointer-events-none absolute inset-x-0 -top-24 h-[42rem]" />
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 h-[30rem] opacity-40" />
        <FloatingMath />
        <Parallax speed={0.16} className="pointer-events-none absolute left-6 top-28"><DotsScatter className="float h-24 w-24 opacity-70" /></Parallax>
        <Parallax speed={-0.12} className="pointer-events-none absolute right-10 bottom-10"><DotsScatter className="float h-20 w-20 opacity-50 [animation-delay:1.5s]" /></Parallax>
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 md:grid-cols-2">
          <Reveal className="space-y-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/70 px-4 py-1.5 text-xs font-bold text-gold-deep shadow-sm backdrop-blur">
              <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-gold-deep" />
              Trusted by 200+ students across Nigeria
            </span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-[4.2rem]">
              We create <span className="text-gradient-gold">solutions</span> for your success
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/55">
              A virtual learning community for students across Nigeria. Our tutors keep a keen eye
              on every learner's progress in maths, sciences and coding — through live online
              sessions, personalised feedback and a portal built for results.
            </p>

            {/* exam boards we prepare learners for */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink/35">Prep for</span>
              {["WAEC", "JAMB", "IGCSE", "SAT", "A-Levels"].map((e) => (
                <span key={e} className="rounded-lg border border-line bg-white/70 px-2.5 py-1 text-[11px] font-bold text-ink/60 backdrop-blur">{e}</span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/apply" className="btn-gold group !min-h-[50px] !rounded-full !px-7 !text-base shadow-lg shadow-gold/30">
                Get started <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <a href="#how" className="group flex items-center gap-3 text-sm font-semibold text-ink/70">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white shadow-sm transition group-hover:border-gold group-hover:shadow-md">
                  <svg className="float h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="#1A60AB" strokeWidth="2.5"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                See how it works
              </a>
            </div>

            {/* social proof: avatar stack + rating */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {["#EFAE56", "#1A60AB", "#7BA3CA", "#C8881F"].map((c, i) => (
                  <span key={i} className="avatar-ring flex h-8 w-8 items-center justify-center rounded-full font-display text-[11px] font-bold text-white" style={{ background: c }}>
                    {["JV", "MA", "AA", "+"][i]}
                  </span>
                ))}
              </div>
              <div className="text-[13px] leading-tight">
                <span className="font-bold text-gold">★★★★★</span>
                <p className="text-ink/50"><span className="font-bold text-ink/70">4.9/5</span> from 200+ learners &amp; parents</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="group relative">
            {/* soft glow + slowly rotating dashed ring behind the cut-out figure */}
            <div className="hero-glow absolute inset-0 scale-110" />
            <div className="ring-spin pointer-events-none absolute inset-8 rounded-full border-2 border-dashed border-gold/25" />
            {/* decorative maths/coding chips orbiting 360° around the image */}
            <div aria-hidden className="hero-orbit pointer-events-none absolute inset-0 z-20 hidden md:block">
              {["π", "∑", "√", "ƒ(x)", "</>", "★"].map((s, i) => {
                const a = (i / 6) * 2 * Math.PI, R = 47;
                const left = 50 + R * Math.sin(a), top = 50 - R * Math.cos(a);
                return (
                  <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }}>
                    <span className="hero-orbit__chip flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 font-display text-[13px] font-bold text-ink shadow-lg ring-1 ring-line backdrop-blur">
                      {s}
                    </span>
                  </span>
                );
              })}
            </div>
            {/* cinematic 3D tilt — follows the cursor on desktop, static on touch */}
            <Tilt3D className="relative" max={10}>
              <Image
                src="/camp-hero.png"
                alt="D-Maths student with the D-Maths robot"
                width={900}
                height={760}
                quality={90}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="float relative z-10 mx-auto h-auto w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ animationDuration: "7s" }}
                priority
              />
              {/* floating stat badges — lifted forward for depth */}
              <div className="hovlift float absolute -left-3 top-8 z-20 rounded-2xl bg-white px-4 py-3 shadow-xl" style={{ transform: "translateZ(60px)" }}>
                <p className="font-display text-xl font-extrabold text-ink">98%</p>
                <p className="text-[11px] font-semibold text-ink/45">Pass rate</p>
              </div>
              <div className="hovlift float absolute -right-3 bottom-10 z-20 rounded-2xl bg-gold px-4 py-3 shadow-xl" style={{ animationDelay: "1.2s", transform: "translateZ(80px)" }}>
                <p className="font-display text-xl font-extrabold text-white">★ 4.9</p>
                <p className="text-[11px] font-semibold text-white/70">Student rating</p>
              </div>
            </Tilt3D>
          </Reveal>
        </div>
      </header>

      {/* CURRICULA MARQUEE — quiet, premium "what we cover" ticker */}
      <section aria-hidden="true" className="border-y border-line/40 bg-white py-3.5">
        <div className="marquee mx-auto max-w-7xl">
          <div className="marquee-track gap-10 pr-10">
            {[...Array(2)].flatMap((_, dup) =>
              ["Algebra", "Calculus", "Geometry", "Physics", "Statistics", "Python", "Web Dev", "WAEC", "JAMB", "IGCSE", "SAT", "A-Levels", "Probability", "Trigonometry"]
                .map((k) => (
                  <span key={`${dup}-${k}`} className="flex items-center gap-3 text-sm font-bold text-ink/35">
                    {k}
                    <span className="h-1 w-1 rounded-full bg-gold/60" />
                  </span>
                )),
            )}
          </div>
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="border-y border-line/40 bg-chalk/40 py-5">
        <Reveal className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5">
          {FEATURES.map(({ label, icon }) => (
            <div key={label} className="group flex items-center gap-2.5">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gold/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold group-hover:text-white">
                <svg className="h-[15px] w-[15px] text-gold-deep transition-colors group-hover:text-white" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icon}
                </svg>
              </span>
              <span className="text-sm font-semibold text-ink/65">{label}</span>
            </div>
          ))}
        </Reveal>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative mx-auto max-w-7xl px-5 py-16">
        <DotsScatter className="float pointer-events-none absolute right-6 top-10 h-16 w-16 opacity-40" />
        <DotsScatter className="float pointer-events-none absolute left-4 bottom-8 h-14 w-14 opacity-30 [animation-delay:1.2s]" />
        <Reveal className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">We Provide The Best <span className="text-gold-deep">Services</span></h2>
          <span className="bar-animate mx-auto mt-3 block h-1 w-16 rounded-full bg-gradient-to-r from-gold to-gold-deep" />
          <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">Unleash the full potential of every student with our subject expertise.</p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <Reveal key={s.t} delay={i * 80}>
              <div className="card-premium group h-full rounded-3xl p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl font-mono text-xl font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: s.c }}>{s.sym}</div>
                <h3 className="font-display text-lg font-bold">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TRY PYTHON — live in-browser playground teaser */}
      <section className="mx-auto max-w-7xl px-5 py-8">
        <Reveal>
          <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] border border-line bg-chalk/50 p-8 sm:p-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white px-3.5 py-1 text-[11px] font-bold text-gold-deep">
                <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-gold-deep" /> New
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">Write <span className="text-gold-deep">code</span> right now</h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/60">
                Real Python — and build a live web page with HTML, CSS &amp; JavaScript — right in your
                browser. No install, no sign-up. Try the hands-on coding learners do at D-Maths.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="/playground" className="btn-gold group inline-flex !rounded-full !px-6">
                  Open the playground <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>
                <Link href="/math-lab" className="btn !rounded-full border border-gold/50 bg-white !px-6 text-gold-deep hover:bg-white/60">
                  Try the Math Lab
                </Link>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b2036] shadow-xl">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 font-mono text-[11px] text-white/40">main.py</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-slate-100"><code>{`for i in range(1, 6):
    print(i, "x", i, "=", i * i)

print("Hello from D-Maths!")`}</code></pre>
              <div className="border-t border-white/10 px-4 py-2.5 font-mono text-[11px] text-emerald-300/90">▶ 1 x 1 = 1 · 2 x 2 = 4 · 3 x 3 = 9 …</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* APP SHOWCASE — the portal in your pocket */}
      <PortalShowcase />

      {/* IMPACT BAND — dark, full-contrast premium moment */}
      <section className="relative my-10">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal className="mesh-dark relative overflow-hidden rounded-[2.5rem] px-6 py-14 shadow-2xl sm:px-14">
            <DotsScatter className="float pointer-events-none absolute right-8 top-8 h-20 w-20 opacity-20" />
            <div className="relative text-center">
              <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Results that <span className="text-gradient-gold">speak</span></h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/60">Real outcomes from a community built entirely around each learner's progress.</p>
            </div>
            <div className="relative mt-10 grid gap-6 sm:grid-cols-3">
              {STATS.map(({ v, suffix, l }) => (
                <div key={l} className="text-center">
                  <div className="font-display text-5xl font-extrabold text-gold md:text-6xl">
                    <CountUp to={v} suffix={suffix} />
                  </div>
                  <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-white/55">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative my-8">
        <div className="mx-auto max-w-7xl px-5">
          <div className="rounded-[2.5rem] bg-gold-pale px-6 py-14 sm:px-12">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <Reveal className="sheen group relative overflow-hidden rounded-2xl shadow-lg">
                <div className="hero-glow absolute -inset-4 z-0" />
                <Tilt3D max={7}>
                  <Image
                    src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85"
                    alt="Students in an online classroom"
                    width={1200}
                    height={820}
                    quality={90}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="relative z-10 h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </Tilt3D>
              </Reveal>
              <Reveal delay={100}>
                <h2 className="font-display text-3xl font-bold md:text-4xl">Simple <span className="text-gold-deep">Solutions!</span></h2>
                <span className="bar-animate mt-3 block h-1 w-16 rounded-full bg-gradient-to-r from-gold to-gold-deep" />
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  We understand that no two students learn alike. That's why we take the time to
                  understand each learner and build a path that works.
                </p>
                <ol className="mt-7 space-y-4">
                  {STEPS.map((s, i) => (
                    <li key={s.t} className="group flex items-start gap-4">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md">{i+1}</span>
                      <div>
                        <p className="font-display font-bold text-ink">{s.t}</p>
                        <p className="text-[13px] text-ink/55">{s.d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/apply" className="btn-gold group !rounded-full !px-6">
                    Get started <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </Link>
                  <Link href="/login" className="btn !rounded-full border border-gold/50 bg-white !px-6 text-gold-deep hover:bg-white/60">Read more</Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="agency" className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal className="order-2 md:order-1">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Our <span className="text-gold-deep">Centre</span></h2>
            <span className="bar-animate mt-3 block h-1 w-16 rounded-full bg-gradient-to-r from-gold to-gold-deep" />
            <p className="mt-4 text-[15px] leading-relaxed text-ink/55">
              We believe in the power of personalised teaching. As a fully virtual community, we
              reach learners anywhere in Nigeria and prepare them for WAEC, JAMB, IGCSE, SAT and
              A-Levels. Let's turn effort into achievement — tailored maths, science and coding
              tuition for every learner.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Live, interactive online sessions — never pre-recorded",
                "A tutor who tracks every learner's progress personally",
                "One portal for classes, assignments, grades and feedback",
              ].map((v) => (
                <li key={v} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[14px] leading-relaxed text-ink/65">{v}</span>
                </li>
              ))}
            </ul>
            <Link href="/apply" className="btn-gold group mt-7 inline-flex !rounded-full !px-6">
              Read more <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </Reveal>
          <Reveal delay={120} className="group relative order-1 md:order-2">
            {/* decorative soft blob behind the cut-out figure */}
            <div className="float absolute inset-0 scale-95 rounded-full bg-gold-pale/70 blur-2xl" />
            <div className="ring-spin pointer-events-none absolute inset-10 rounded-full border-2 border-dashed border-gold/20" />
            <Image
              src="/camp-about.png"
              alt="D-Maths learner with the D-Maths robot"
              width={900}
              height={760}
              quality={90}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="float relative z-10 mx-auto h-auto w-full object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
              style={{ animationDuration: "9s" }}
            />
          </Reveal>
        </div>
      </section>

      {/* FOUNDER */}
      <section id="founder" className="bg-chalk/40 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <Reveal className="group relative mx-auto w-full max-w-sm">
              {/* soft gold blob behind the portrait for depth */}
              <div className="float absolute inset-0 -z-0 scale-95 rounded-full bg-gold-pale/70 blur-2xl" />
              <div className="sheen relative z-10 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-line/60">
                <Image
                  src="/founder.jpg"
                  alt="Bakare Oladapo E., founder of D-Maths"
                  width={1086}
                  height={1448}
                  quality={90}
                  sizes="(max-width: 768px) 90vw, 40vw"
                  className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              {/* floating name badge */}
              <div className="hovlift float absolute -bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-2xl bg-white px-5 py-2.5 text-center shadow-xl">
                <p className="font-display text-sm font-extrabold text-ink">Bakare Oladapo E.</p>
                <p className="text-[11px] font-semibold text-gold-deep">Founder &amp; Lead Educator</p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-pale px-4 py-1.5 text-xs font-bold text-gold-deep">
                <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-gold-deep" />
                About the Founder
              </span>
              <h2 className="mt-5 font-display text-3xl font-bold md:text-4xl">
                Bakare <span className="text-gold-deep">Oladapo E.</span>
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Web Developer", "Data Analyst", "AI Engineer"].map((role) => (
                  <span key={role} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-ink/70 shadow-sm ring-1 ring-line/70">
                    {role}
                  </span>
                ))}
              </div>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-ink/60">
                <p>
               Meet D-Maths, the visionary behind the D-Maths Learning Portal—a passionate educator
                  and technology professional dedicated to transforming education through innovation.
                </p>
                <p>
                 As a Web Developer, Data Analyst, and AI Engineer,
                  he combines expertise in software development, data-driven decision-making, 
                  and artificial intelligence to create educational solutions that are practical, engaging, and impactful. 
                  With a strong foundation in mathematics education and technology,
                  he is committed to bridging the gap between traditional teaching methods and modern digital learning.
                </p>
                <p>
                  Driven by the belief that every learner deserves access to high-quality education,
                  he founded the D-Maths Learning Portal to provide an interactive platform where students can learn,
                  practice, monitor their progress, and develop future-ready skills in mathematics, coding,
                  artificial intelligence, and technology.
                </p>
                <p>
                  Beyond teaching, he is passionate about building innovative digital products that empower schools, educators, 
                  and learners across Africa and beyond. Through his work, he continues to inspire the next generation of problem-solvers,
                  innovators, and technology leaders.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="results" className="relative overflow-hidden bg-chalk py-20">
        <DotsScatter className="float pointer-events-none absolute right-8 top-12 h-16 w-16 opacity-40" />
        <div className="aurora pointer-events-none absolute inset-x-0 bottom-0 h-72 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-5">
          <Reveal className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">What <span className="text-gold-deep">Clients</span> Say!</h2>
            <span className="bar-animate mx-auto mt-3 block h-1 w-16 rounded-full bg-gradient-to-r from-gold to-gold-deep" />
            <p className="mx-auto mt-3 max-w-md text-sm text-ink/50">See how D-Maths has helped students achieve their goals.</p>
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.n} delay={i * 80}>
                <Tilt3D max={6} className="h-full">
                <figure className="card-premium group relative h-full overflow-hidden rounded-3xl p-6">
                  <span className="pointer-events-none absolute -right-1 -top-3 font-display text-7xl font-extrabold text-gold/10 transition-colors duration-300 group-hover:text-gold/20" aria-hidden="true">&rdquo;</span>
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold font-display font-bold text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                      {t.n.split(" ").map(w=>w[0]).slice(0,2).join("")}
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold">{t.n}</p>
                      <p className="text-xs text-ink/45">{t.r}</p>
                    </div>
                  </div>
                  <blockquote className="relative mt-4 text-[13px] leading-relaxed text-ink/60">{t.t}</blockquote>
                  <div className="mt-4 inline-flex text-gold transition-transform duration-300 group-hover:scale-110">{"★".repeat(5)}</div>
                </figure>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <Reveal>
          <div className="mesh-dark group relative flex flex-col items-center justify-between gap-5 overflow-hidden rounded-[2rem] px-8 py-10 shadow-2xl sm:flex-row sm:px-12">
            <div aria-hidden className="pointer-events-none absolute right-40 top-4 select-none font-display text-4xl font-bold text-gold/25 float">π</div>
            <DotsScatter className="float pointer-events-none absolute -left-2 bottom-2 h-16 w-16 opacity-20" />
            <div className="relative text-center sm:text-left">
              <p className="font-display text-2xl font-bold text-white md:text-3xl">Ready to get started?</p>
              <p className="mt-1.5 text-sm text-white/60">100% online — study from home, anywhere in Nigeria. Setup takes minutes.</p>
            </div>
            <Link href="/apply" className="btn-gold relative inline-flex items-center gap-1.5 !rounded-full !px-8 !text-base shadow-lg shadow-gold/30 transition hover:scale-105">
              Apply now <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="relative bg-white pt-12">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-10 sm:grid-cols-2 md:grid-cols-5">
          <div>
            <p className="font-display text-lg font-bold text-ink">D-Maths</p>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink/50">
              A virtual learning community delivering world-class online tuition in maths, sciences
              and coding to learners across Nigeria — with prep for WAEC, JAMB, IGCSE, SAT and A-Levels.
            </p>
          </div>
          <FooterCol title="Centre" links={[["About","#agency"],["Founder","#founder"],["Services","#services"],["Results","#results"],["Apply","/apply"]]} />
          <FooterCol title="Learn" links={[["Login","/login"],["How it works","#how"],["Help & FAQ","/help"]]} />
          <FooterCol title="Legal" links={[["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Refund Policy","/refunds"],["Delete account","/delete-account"]]} />
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Contact</h4>
            <ul className="mt-3 space-y-2 text-[13px] text-ink/55">
              <li>
                <a href="mailto:dmathstuition@gmail.com" className="hover:text-gold-deep">
                  dmathstuition@gmail.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/2347025674894" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-gold-deep">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: "#25D366" }} />
                  WhatsApp: +234 70 2567 4894
                </a>
              </li>
            </ul>
          </div>
        </div>
        {/* social row */}
        <div className="mx-auto max-w-7xl px-5">
          <div className="divider-fade" />
          <div className="flex flex-col items-center gap-3 py-7 sm:flex-row sm:justify-between">
            <p className="text-sm font-semibold text-ink/55">Follow D-Maths &amp; the founder</p>
            <SocialLinks className="justify-center" />
          </div>
        </div>
        <div className="bg-gold py-4 text-center text-xs font-semibold text-white">
          © {new Date().getFullYear()} D-Maths Tuition Centre · dmathstuition@gmail.com · Asaba, Delta State
        </div>
      </footer>

      {/* FLOATING SUMMER CAMP CTA */}
      <Link
        href="/summer-camp"
        aria-label="Register for the D-Maths Summer Camp"
        className="btn-gold badge-pulse fixed bottom-6 left-6 z-50 flex items-center gap-2 !rounded-full !px-5 shadow-xl transition hover:scale-105 hover:shadow-2xl"
      >
        <span aria-hidden="true">☀️</span>
        <span className="text-sm font-bold">Summer Camp</span>
      </Link>

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
