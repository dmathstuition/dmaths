import Image from "next/image";
import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";

export const metadata = {
  title: "About — Novelia Academy",
  description: "Novelia is a fully virtual tuition community preparing learners worldwide for WAEC, JAMB, IGCSE, SAT and A-Levels through personalised online teaching.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  "Live, interactive online sessions — never pre-recorded",
  "A tutor who tracks every learner's progress personally",
  "One portal for classes, assignments, grades and feedback",
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <PageHeader eyebrow="About us" title="Our Centre"
        lead="We believe in the power of personalised teaching. As a fully virtual community, we reach learners anywhere in the world and prepare them for the exams that shape their future." />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <Reveal className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">Turning effort into achievement</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
              Novelia delivers tailored maths, science and coding tuition for every learner. We prepare
              students for WAEC, JAMB, IGCSE, SAT, A-Levels and KS2/KS3 — meeting each child where they are
              and building a clear path forward.
            </p>
            <ul className="mt-6 space-y-3">
              {VALUES.map(v => (
                <li key={v} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-deep">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span className="text-[14px] leading-relaxed text-ink/65">{v}</span>
                </li>
              ))}
            </ul>
            <Link href="/apply" className="btn-gold mt-7 inline-flex !rounded-full !px-6">Register now</Link>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
            <Image src="/about.jpg" alt="A Novelia learner" width={900} height={760} quality={90}
              sizes="(max-width: 768px) 100vw, 50vw" className="h-auto w-full object-contain" />
          </div>
        </Reveal>
      </section>

      {/* Co-founders */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold-deep">Our co-founders</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">The partnership behind Novelia Academy</h2>
            <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-ink/55">
              Novelia Academy is founded and led by a partnership of educators and technologists who
              share one goal: high-quality, personalised learning for every child.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {/* Co-founder 1 — Bakare */}
            <Reveal className="glass-card flex flex-col overflow-hidden !rounded-3xl">
              <div className="aspect-[4/3] w-full overflow-hidden bg-white">
                <Image src="/founder.jpg" alt="Bakare Oladapo E., co-founder of Novelia Academy"
                  width={1086} height={1448} quality={90} sizes="(max-width: 768px) 100vw, 50vw"
                  className="h-full w-full object-cover object-top" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="font-display text-lg font-bold text-ink">Bakare Oladapo E.</p>
                <p className="text-[12px] font-semibold text-gold-deep">Co-Founder &amp; Lead Educator</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Web Developer", "Data Analyst", "AI Engineer"].map(role => (
                    <span key={role} className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink/70">{role}</span>
                  ))}
                </div>
                <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink/60">
                  <p>
                    A passionate educator and technology professional dedicated to transforming education
                    through innovation. As a Web Developer, Data Analyst and AI Engineer, he combines software
                    development, data-driven decision-making and artificial intelligence to build learning that
                    is practical, engaging and effective.
                  </p>
                  <p>
                    Driven by the belief that every learner deserves access to high-quality education, he
                    co-founded Novelia Academy to give students an interactive place to learn, practise, track
                    their progress and develop future-ready skills in maths, coding, A.I and technology.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Co-founder 2 — PLACEHOLDER: replace name, role, photo and bio */}
            <Reveal delay={90} className="glass-card flex flex-col overflow-hidden !rounded-3xl">
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-ink/10 to-gold/10">
                <div className="flex flex-col items-center text-ink/40">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/70 font-display text-2xl font-bold text-ink/50">N</span>
                  <span className="mt-2 text-[12px] font-semibold">Photo coming soon</span>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="font-display text-lg font-bold text-ink">Co-founder&rsquo;s name</p>
                <p className="text-[12px] font-semibold text-gold-deep">Co-Founder</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Role", "Role"].map((role, i) => (
                    <span key={i} className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-semibold text-ink/50">{role}</span>
                  ))}
                </div>
                <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink/50">
                  <p>
                    A short bio for the second co-founder goes here — their background, expertise and what they
                    bring to Novelia Academy. Replace this placeholder with their real details, and add their
                    photo at <code className="rounded bg-chalk px-1 text-[12px]">/public/cofounder.jpg</code>.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
