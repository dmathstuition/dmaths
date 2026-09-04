import Image from "next/image";
import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";

export const metadata = {
  title: "About — D-Maths Tuition",
  description: "D-Maths is a fully virtual tuition community preparing learners worldwide for WAEC, JAMB, IGCSE, SAT and A-Levels through personalised online teaching.",
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
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">Turning effort into achievement</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/60">
              D-Maths delivers tailored maths, science and coding tuition for every learner. We prepare
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
            <Image src="/camp-about.png" alt="A D-Maths learner" width={900} height={760} quality={90}
              sizes="(max-width: 768px) 100vw, 50vw" className="h-auto w-full object-contain" />
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid items-start gap-12 md:grid-cols-[320px_1fr]">
            <div className="mx-auto w-full max-w-xs">
              <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
                <Image src="/founder.jpg" alt="Bakare Oladapo E., founder of D-Maths"
                  width={1086} height={1448} quality={90} sizes="(max-width: 768px) 90vw, 320px"
                  className="h-auto w-full object-cover" />
              </div>
              <div className="mt-4 text-center">
                <p className="font-display text-base font-bold text-ink">Bakare Oladapo E.</p>
                <p className="text-[12px] font-semibold text-gold-deep">Founder &amp; Lead Educator</p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-gold-deep">About the founder</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-ink md:text-3xl">Bakare Oladapo E.</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Web Developer", "Data Analyst", "AI Engineer"].map(role => (
                  <span key={role} className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-ink/70">{role}</span>
                ))}
              </div>
              <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink/60">
                <p>
                  Meet the visionary behind the D-Maths Learning Portal — a passionate educator and
                  technology professional dedicated to transforming education through innovation.
                </p>
                <p>
                  As a Web Developer, Data Analyst and AI Engineer, he combines expertise in software
                  development, data-driven decision-making and artificial intelligence to create educational
                  solutions that are practical, engaging and impactful. With a strong foundation in mathematics
                  education and technology, he is committed to bridging the gap between traditional teaching
                  methods and modern digital learning.
                </p>
                <p>
                  Driven by the belief that every learner deserves access to high-quality education, he founded
                  the D-Maths Learning Portal to provide an interactive platform where students learn, practise,
                  monitor their progress and develop future-ready skills in mathematics, coding, artificial
                  intelligence and technology.
                </p>
                <p>
                  Beyond teaching, he is passionate about building innovative digital products that empower
                  schools, educators and learners across Africa and beyond — inspiring the next generation of
                  problem-solvers, innovators and technology leaders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
