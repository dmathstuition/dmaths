import Link from "next/link";
import Logo from "@/components/Logo";

const SUBJECTS = [
  { t: "Algebra & Pre-Calculus", d: "Linear equations, polynomials, quadratics, functions and inequalities.", l: "JSS 1–SSS 2", sym: "ƒ(x)" },
  { t: "Calculus & Analysis", d: "Limits, derivatives, integrals and real-world problem solving.", l: "SSS 2–3", sym: "∫" },
  { t: "Statistics & Probability", d: "Data analysis, distributions, regression and hypothesis testing.", l: "JSS 3–SSS 3", sym: "σ" },
  { t: "Geometry & Trigonometry", d: "Circle theorems, identities and coordinate geometry.", l: "JSS 1–SSS 2", sym: "△" },
  { t: "Further Mathematics", d: "Complex numbers, matrices and vectors for university entrance.", l: "SSS 3+", sym: "∑" },
  { t: "Core Maths Revision", d: "Intensive BECE & WASSCE revision across the full curriculum.", l: "All levels", sym: "π" },
  { t: "Physics", d: "Mechanics, waves, electricity and modern physics for exam success.", l: "SSS 1–3", sym: "⚡" },
  { t: "Python & JavaScript", d: "Programming fundamentals, algorithms and the Python Practice Challenge.", l: "All levels", sym: ">_" },
  { t: "Exam Preparation", d: "Focused BECE, WASSCE and university entrance coaching.", l: "All levels", sym: "★" },
];

const STEPS = [
  { t: "Register & pay", d: "Submit the enrolment form and pay by bank transfer or Opay — or instantly online." },
  { t: "We verify", d: "Your details and payment are confirmed, usually within 24 hours." },
  { t: "Get access", d: "Your Student ID and password arrive by email." },
  { t: "Start learning", d: "Join live classes, submit work and watch your progress climb." },
];

const TESTIMONIALS = [
  { n: "Joseph Victor", r: "SSS 2 student", t: "D-Maths transformed my understanding of calculus. I went from failing to 91% in three months." },
  { n: "Mrs Adetunji", r: "Parent", t: "My daughter's confidence in mathematics has improved remarkably. The personalised feedback is incredible." },
  { n: "Alli Abdulsamod", r: "FUNAAB undergraduate", t: "D-Maths prepared me exceptionally well for my entrance exams. I credit them for my distinction." },
  { n: "Dr. Lookman Ayobami", r: "Parent & STEM advocate", t: "The quality of instruction rivals any international institution. Educators who genuinely care." },
];

export default function Landing() {
  return (
    <main className="bg-white text-ink">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="hidden gap-1 md:flex">
            {[["#about","About"],["#subjects","Subjects"],["#how","How it works"],["#results","Results"],["#contact","Contact"]].map(([h,l]) => (
              <a key={h} href={h} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink/55 transition hover:bg-chalk hover:text-ink">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-bold text-ink/70 transition hover:bg-chalk sm:block">Log in</Link>
            <Link href="/apply" className="btn-gold !min-h-[38px] !px-4">Apply now</Link>
          </div>
        </div>
      </nav>

      <header className="relative overflow-hidden pt-32 pb-20">
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute right-[-12%] top-[-8%] h-[55vh] w-[55vh] rounded-full bg-gold/10 blur-[130px]" />
        <div className="pointer-events-none absolute left-[-10%] bottom-[-15%] h-[45vh] w-[45vh] rounded-full bg-ink/[0.06] blur-[120px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 md:grid-cols-2">
          <div>
            <p className="reveal reveal-1 mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[.18em] text-ink/60 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Excellence in mathematics
            </p>
            <h1 className="reveal reveal-2 font-display text-5xl font-semibold leading-[1.04] text-ink md:text-6xl">
              Where numbers <span className="accent-stroke text-gold-deep">come alive</span> & students thrive
            </h1>
            <p className="reveal reveal-3 mt-6 max-w-md text-lg leading-relaxed text-ink/55">
              World-class online mathematics tuition for JSS and SSS students — expert tutors,
              personalised pathways and a portal built for results.
            </p>
            <div className="reveal reveal-3 mt-9 flex flex-wrap gap-3">
              <Link href="/apply" className="btn-gold !min-h-[52px] !px-7 !text-base">Apply for enrolment →</Link>
              <Link href="/login" className="btn !min-h-[52px] !px-7 border-2 border-ink/15 text-ink transition hover:border-ink/30 hover:bg-chalk">Student login</Link>
            </div>
            <div className="reveal reveal-4 mt-12 grid max-w-md grid-cols-4 gap-6">
              {[["200+","Students"],["98%","Pass rate"],["6","Tutors"],["2023","Founded"]].map(([v,l]) => (
                <div key={l}>
                  <div className="font-display text-3xl font-semibold text-ink">{v}</div>
                  <div className="mt-1 text-xs font-semibold text-ink/40">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden justify-center md:flex">
            <div className="reveal reveal-3 float w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-[0_24px_70px_rgba(26,96,171,.16)]">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-ink/40">SSS 2 · Calculus</p>
                <span className="rounded-full bg-gold-pale px-2.5 py-1 text-[10px] font-bold text-gold-deep">This week</span>
              </div>
              <div className="mt-4 rounded-2xl bg-board p-5 text-white">
                <p className="font-mono text-sm text-white/50">Worked example</p>
                <p className="mt-2 font-mono text-lg text-gold-soft">
                  d/dx (x³ − 4x) <span className="text-white/40">=</span> 3x² − 4
                </p>
              </div>
              <div className="mt-6 space-y-3.5">
                {[["Algebra",87],["Calculus",90],["Statistics",92],["Geometry",84]].map(([s,v]) => (
                  <div key={s as string}>
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="font-semibold text-ink/65">{s}</span>
                      <span className="font-bold text-ink">{v}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-chalk">
                      <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-soft" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-pale px-4 py-2.5 text-[13px] font-bold text-gold-deep">
                Top students excelling this term
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto mt-20 max-w-6xl px-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-y border-line py-5 text-center">
            {["WAEC syllabus","BECE preparation","WASSCE preparation","University entrance","Python Practice Challenge"].map(c => (
              <span key={c} className="font-mono text-[12px] font-bold uppercase tracking-wide text-ink/40">{c}</span>
            ))}
          </div>
        </div>
      </header>

      <section id="about" className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <Eyebrow>About D-Maths</Eyebrow>
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink">Nigeria's premier online mathematics tuition centre</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/55">
              D-Maths was founded with a single mission: to make exceptional mathematics education
              accessible to every student. Each learner receives a personalised path, real-time
              progress tracking and direct tutor support through the portal.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-4">
              {[["10+","Years teaching"],["500+","Students taught"],["98%","Success rate"]].map(([v,l]) => (
                <div key={l} className="rounded-2xl border border-line bg-chalk/50 p-4 text-center">
                  <div className="font-display text-2xl font-semibold text-ink">{v}</div>
                  <div className="mt-1 text-[11px] font-semibold text-ink/45">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-board to-boardDeep p-9 text-white">
            <div className="pointer-events-none absolute -right-8 top-1/2 h-1 w-48 -rotate-45 bg-gold/50" />
            <p className="font-display text-xl italic leading-relaxed text-white/90">
              "Mathematics is not just a subject — it is the language of the universe.
              Our mission is to make every student fluent."
            </p>
            <div className="mt-7 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold font-display text-xl font-bold text-board">OB</div>
              <div>
                <p className="font-bold">Mr. Oladapo Bakare</p>
                <p className="text-sm text-white/50">Founder & lead tutor</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="subjects" className="bg-chalk py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <Eyebrow center>What we teach</Eyebrow>
            <h2 className="font-display text-4xl font-semibold text-ink">Our subject offerings</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map(s => (
              <div key={s.t} className="hovlift group rounded-2xl border border-line bg-white p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ink/[0.07] font-mono text-lg text-ink transition group-hover:bg-gold group-hover:text-board">{s.sym}</div>
                <h3 className="font-display text-lg font-semibold text-ink">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/55">{s.d}</p>
                <p className="mt-4 inline-block rounded-full bg-chalk px-3 py-1 text-[11px] font-bold text-ink/50">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <Eyebrow center>The process</Eyebrow>
          <h2 className="font-display text-4xl font-semibold text-ink">Four steps to begin</h2>
        </div>
        <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="hovlift relative rounded-2xl border border-line bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-board font-display text-lg font-semibold text-gold-soft">{i + 1}</span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link href="/apply" className="btn-gold !min-h-[52px] !px-8 !text-base">Start your application →</Link>
        </div>
      </section>

      <section id="results" className="bg-chalk py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <Eyebrow center>Student stories</Eyebrow>
            <h2 className="font-display text-4xl font-semibold text-ink">What our students say</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {TESTIMONIALS.map(t => (
              <figure key={t.n} className="hovlift rounded-2xl border border-line bg-white p-7">
                <div className="font-display text-4xl leading-none text-gold/40">&ldquo;</div>
                <blockquote className="-mt-3 text-lg italic leading-relaxed text-ink/70">{t.t}</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-board font-display font-bold text-gold-soft">
                    {t.n.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-ink">{t.n}</p>
                    <p className="text-xs text-ink/45">{t.r}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-board to-boardDeep px-8 py-14 text-center text-white">
          <div className="dotgrid pointer-events-none absolute inset-0 opacity-10" />
          <div className="pointer-events-none absolute -right-6 top-8 h-1 w-56 -rotate-45 bg-gold/50" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to begin?</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">Join hundreds of students mastering mathematics with D-Maths.</p>
            <Link href="/apply" className="btn-gold mt-7 inline-flex !min-h-[52px] !px-8 !text-base">Apply for enrolment →</Link>
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-line bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink/50">
              Delivering world-class online mathematics education to JSS and SSS students across Nigeria.
            </p>
          </div>
          <div className="text-sm leading-loose text-ink/60">
            <h4 className="mb-3 font-display text-lg font-semibold text-ink">Get in touch</h4>
            <p>dmathstuition@gmail.com</p>
            <p>+234 70 2567 4894 · +234 80 7166 7406</p>
            <p>Asaba, Delta State, Nigeria</p>
            <p>Mon–Fri 8am–8pm · Sat 9am–5pm</p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-lg font-semibold text-ink">Student portal</h4>
            <p className="mb-4 text-sm text-ink/50">Already enrolled? Access your dashboard.</p>
            <Link href="/login" className="btn-gold">Enter portal →</Link>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-6xl border-t border-line px-5 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/privacy" className="text-ink/45 hover:text-gold-deep">Privacy Policy</Link>
            <Link href="/terms" className="text-ink/45 hover:text-gold-deep">Terms of Service</Link>
            <Link href="/refunds" className="text-ink/45 hover:text-gold-deep">Payment & Refund Policy</Link>
          </div>
          <p className="mt-4 text-center text-xs text-ink/35">
            © {new Date().getFullYear()} D-Maths Tuition Centre. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`mb-3 flex items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[.22em] text-gold-deep ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-0.5 w-7 bg-gold" />{children}
    </p>
  );
}
