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
  { t: "JavaScript", d: "Web fundamentals, DOM manipulation and modern ES6+.", l: "All levels", sym: "{}" },
  { t: "Python", d: "Data structures, algorithms, automation and data-science basics.", l: "All levels", sym: ">_" },
];

const STEPS = [
  { t: "Register & pay", d: "Submit the enrolment form and pay via bank transfer or Opay." },
  { t: "Admin verification", d: "We verify your payment and details within 24 hours." },
  { t: "Portal access", d: "Your Student ID and password arrive by email." },
  { t: "Start learning", d: "Join live classes, submit work and track your progress." },
];

const TESTIMONIALS = [
  { n: "Joseph Victor", r: "SSS 2 student", t: "D-Maths transformed my understanding of calculus. I went from failing to 91% in three months." },
  { n: "Mrs Adetunji", r: "Parent", t: "My daughter's confidence in mathematics has improved remarkably. The personalised feedback is incredible." },
  { n: "Alli Abdulsamod", r: "FUNAAB undergraduate", t: "D-Maths prepared me exceptionally well for my entrance exams. I credit them for my distinction." },
  { n: "Dr. Lookman Ayobami", r: "Parent & STEM advocate", t: "The quality of instruction rivals any international institution. Educators who genuinely care." },
];

export default function Landing() {
  return (
    <main>
      {/* ── NAV ── */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-board/90 backdrop-blur border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo light />
          <div className="hidden gap-1 md:flex">
            {[["#about","About"],["#subjects","Subjects"],["#how","How it works"],["#results","Results"],["#contact","Contact"]].map(([h,l]) => (
              <a key={h} href={h} className="rounded-lg px-3 py-2 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white">{l}</a>
            ))}
          </div>
          <Link href="/login" className="btn-gold !min-h-[38px] !px-4">Enter portal</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <header className="boardgrid relative overflow-hidden bg-board pt-32 pb-24 text-white">
        <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[60vh] w-[60vh] rounded-full bg-gold/10 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 md:grid-cols-2">
          <div>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[.25em] text-gold-soft">Excellence in mathematics</p>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
              Where numbers <em className="text-gold-soft">come alive</em> & students thrive
            </h1>
            <p className="mt-6 max-w-md text-white/60 leading-relaxed">
              World-class online mathematics tuition for primary and secondary students —
              expert tutors, personalised pathways and a portal built for results.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/apply" className="btn-gold !min-h-[52px] !px-7 !text-base">Apply for enrolment →</Link>
              <Link href="/login" className="btn !min-h-[52px] !px-7 border-2 border-white/25 text-white hover:bg-white/10">Student login</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-10">
              {[["200+","Students"],["98%","Pass rate"],["6","Expert tutors"],["2023","Founded"]].map(([v,l]) => (
                <div key={l}>
                  <div className="font-display text-3xl font-semibold text-gold-soft">{v}</div>
                  <div className="mt-1 text-xs font-semibold text-white/40">{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Signature: worked-equation card */}
          <div className="hidden justify-center md:flex">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur">
              <p className="font-mono text-xs text-white/40">This week in SSS 2 Calculus</p>
              <p className="mt-4 font-mono text-lg leading-loose text-gold-soft">
                d/dx (x³ − 4x) <span className="text-white/40">=</span> 3x² − 4
              </p>
              <div className="mt-6 space-y-4">
                {[["Algebra",87],["Calculus",90],["Statistics",92],["Geometry",84]].map(([s,v]) => (
                  <div key={s as string}>
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="text-white/70">{s}</span>
                      <span className="font-bold text-gold-soft">{v}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-lg border border-gold/25 bg-gold/10 px-4 py-2.5 text-[13px] font-bold text-gold-soft">🏆 Top students excelling this term</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── ABOUT ── */}
      <section id="about" className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <div>
            <Eyebrow>About D-Maths</Eyebrow>
            <h2 className="font-display text-4xl font-semibold leading-tight">Nigeria's premier online mathematics tuition centre</h2>
            <p className="mt-5 leading-relaxed text-ink/60">
              D-Maths was founded with a single mission: to make exceptional mathematics education
              accessible to every student. Every learner receives a personalised path, real-time
              progress tracking and direct tutor support through the portal.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["WAEC syllabus","BECE prep","WASSCE prep","University entrance","Core maths"].map(c => (
                <span key={c} className="pill-gold">{c}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ink p-9 text-white">
            <p className="font-display text-xl italic leading-relaxed text-white/85">
              "Mathematics is not just a subject — it is the language of the universe.
              Our mission is to make every student fluent."
            </p>
            <div className="mt-7 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold font-display text-xl font-bold text-board">OB</div>
              <div>
                <p className="font-bold">Mr. Oladapo Bakare</p>
                <p className="text-sm text-white/45">Founder & lead tutor</p>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-center">
              {[["10+","Years teaching"],["500+","Students taught"],["98%","Success rate"]].map(([v,l]) => (
                <div key={l}>
                  <div className="font-display text-2xl font-semibold text-gold-soft">{v}</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/40">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section id="subjects" className="boardgrid bg-ink py-24 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <Eyebrow center>What we teach</Eyebrow>
            <h2 className="font-display text-4xl font-semibold">Our subject offerings</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map(s => (
              <div key={s.t} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-gold/30">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/15 font-mono text-lg text-gold-soft">{s.sym}</div>
                <h3 className="font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{s.d}</p>
                <p className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <Eyebrow center>The process</Eyebrow>
          <h2 className="font-display text-4xl font-semibold">Four steps to begin</h2>
        </div>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="card relative p-6">
              <span className="absolute right-5 top-5 font-display text-3xl font-semibold text-gold/30">{i + 1}</span>
              <h3 className="font-display text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/55">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link href="/apply" className="btn-gold !min-h-[52px] !px-8 !text-base">Start your application →</Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="results" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <Eyebrow center>Student stories</Eyebrow>
            <h2 className="font-display text-4xl font-semibold">What our students say</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {TESTIMONIALS.map(t => (
              <figure key={t.n} className="card p-7">
                <blockquote className="italic leading-relaxed text-ink/70">"{t.t}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display font-bold text-gold-soft">
                    {t.n.split(" ").map(w => w[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold">{t.n}</p>
                    <p className="text-xs text-ink/45">{t.r}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT / FOOTER ── */}
      <footer id="contact" className="bg-board py-20 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/40">
              Delivering world-class online mathematics education to JSS and SSS students across Nigeria.
            </p>
          </div>
          <div className="text-sm leading-loose text-white/55">
            <h4 className="mb-3 font-display text-lg text-white">Get in touch</h4>
            <p>dmathstuition@gmail.com</p>
            <p>+234 70 2567 4894 · +234 80 7166 7406</p>
            <p>Asaba, Delta State, Nigeria</p>
            <p>Mon–Fri 8am–8pm · Sat 9am–5pm</p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-lg">Student portal</h4>
            <p className="mb-4 text-sm text-white/40">Already enrolled? Access your dashboard.</p>
            <Link href="/login" className="btn-gold">Enter portal →</Link>
          </div>
        </div>
        <p className="mt-14 text-center text-xs text-white/25">
          © {new Date().getFullYear()} D-Maths Tuition Centre. All rights reserved.
        </p>
      </footer>
    </main>
  );
}

function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`mb-3 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[.22em] text-gold ${center ? "justify-center" : ""}`}>
      <span className="inline-block h-0.5 w-7 bg-gold" />{children}
    </p>
  );
}

