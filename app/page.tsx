import Link from "next/link";
import Image from "next/image";
import MarketingShell from "@/components/landing/MarketingShell";
import AppLauncher from "@/components/AppLauncher";
import InstallPrompt from "@/components/InstallPrompt";

const EXAMS = ["WAEC", "JAMB", "IGCSE", "SAT", "A-Levels"];

const HIGHLIGHTS = [
  { t: "Live online classes", d: "Interactive sessions with a tutor — never pre-recorded." },
  { t: "Personal progress tracking", d: "Grades, attendance and feedback in one portal." },
  { t: "Exam-focused teaching", d: "Structured prep aligned to the exams that matter." },
  { t: "A tutor who knows your child", d: "Small-group attention and personalised feedback." },
];

const SUBJECTS = [
  { t: "Mathematics", d: "From arithmetic and algebra to calculus and further maths, built step by step." },
  { t: "English & Sciences", d: "Comprehension, writing and the sciences across every level and curriculum." },
  { t: "Exam preparation", d: "Focused preparation for WAEC, JAMB, IGCSE, SAT, A-Levels and KS2/KS3." },
  { t: "Coding & technology", d: "Python, web development and beginner-friendly artificial intelligence." },
];

const STATS = [
  { v: "200+", l: "Students taught" },
  { v: "98%", l: "Pass rate" },
  { v: "6", l: "Expert tutors" },
];

const TESTIMONIALS = [
  { n: "Joseph Victor", r: "SSS 2 student", t: "D-Maths transformed my understanding of calculus. I went from failing to 91% in three months." },
  { n: "Mrs Adetunji", r: "Parent", t: "My daughter's confidence in mathematics has improved remarkably. The feedback is incredible." },
  { n: "Alli Abdulsamod", r: "Undergraduate", t: "D-Maths prepared me exceptionally well for my entrance exams — I credit them for my distinction." },
];

export const metadata = {
  title: "D-Maths Tuition — online maths, science & coding tuition",
  description: "A virtual learning community delivering world-class online tuition in maths, sciences and coding across Nigeria, with preparation for WAEC, JAMB, IGCSE, SAT and A-Levels.",
};

export default function Home() {
  return (
    <MarketingShell>
      <AppLauncher />
      <InstallPrompt />

      {/* HERO */}
      <section className="border-b border-line bg-gradient-to-b from-chalk/60 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-20">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold-deep">D-Maths Tuition Centre</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink md:text-5xl">
              Solutions for your child&apos;s <span className="text-gold-deep">academic success</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/60">
              A virtual learning community for students across Nigeria. Our tutors keep a close eye on
              every learner&apos;s progress in maths, sciences and coding — through live online sessions,
              personalised feedback and a portal built for results.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/apply" className="btn-gold !min-h-[48px] !rounded-full !px-7">Register now</Link>
              <Link href="/programmes" className="btn !min-h-[48px] !rounded-full border border-line bg-white !px-7 text-ink/70 hover:bg-chalk">Explore programmes</Link>
            </div>
            <div className="mt-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Preparation for</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMS.map(e => (
                  <span key={e} className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-bold text-ink/60">{e}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
              <Image src="/camp-hero.png" alt="A D-Maths student learning online"
                width={900} height={760} quality={90} priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="h-auto w-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(h => (
            <div key={h.t} className="rounded-2xl border border-line bg-white p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-pale text-gold-deep">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-ink">{h.t}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/55">{h.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT WE TEACH */}
      <section className="border-y border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">What we teach</h2>
              <p className="mt-2 max-w-lg text-sm text-ink/55">Subject expertise across every level and curriculum.</p>
            </div>
            <Link href="/programmes" className="text-sm font-bold text-gold-deep hover:underline">See all programmes →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUBJECTS.map(s => (
              <div key={s.t} className="rounded-2xl border border-line bg-white p-6">
                <h3 className="font-display text-lg font-bold text-ink">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-6 rounded-3xl border border-line bg-board px-6 py-10 text-center sm:grid-cols-3 sm:px-12">
          {STATS.map(s => (
            <div key={s.l}>
              <p className="font-display text-4xl font-extrabold text-gold md:text-5xl">{s.v}</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-white/60">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-ink md:text-3xl">What families say</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map(t => (
              <figure key={t.n} className="rounded-2xl border border-line bg-white p-6">
                <div className="text-gold">{"★".repeat(5)}</div>
                <blockquote className="mt-3 text-[14px] leading-relaxed text-ink/70">&ldquo;{t.t}&rdquo;</blockquote>
                <figcaption className="mt-4 border-t border-line pt-3">
                  <p className="text-sm font-bold text-ink">{t.n}</p>
                  <p className="text-xs text-ink/45">{t.r}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-board px-8 py-10 text-center sm:flex-row sm:px-12 sm:text-left">
          <div>
            <p className="font-display text-2xl font-bold text-white md:text-3xl">Ready to get started?</p>
            <p className="mt-1.5 text-sm text-white/60">100% online — study from home, anywhere in Nigeria. Setup takes minutes.</p>
          </div>
          <Link href="/apply" className="btn-gold !min-h-[48px] !rounded-full !px-8 !text-base">Register now</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
