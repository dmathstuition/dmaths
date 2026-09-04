import Link from "next/link";
import MarketingShell, { PageHeader } from "@/components/landing/MarketingShell";

export const metadata = {
  title: "Programmes — D-Maths Tuition",
  description: "Online tuition programmes in mathematics, English, sciences and coding, with focused preparation for WAEC, JAMB, IGCSE, SAT, A-Levels and KS2/KS3.",
  alternates: { canonical: "/programmes" },
};

const SERVICES = [
  { t: "Mathematics & Calculus", d: "From algebra and geometry to derivatives and integrals, built step by step for real understanding." },
  { t: "English & Sciences", d: "Comprehension, writing, physics, data and probability across every level and curriculum." },
  { t: "Exam preparation", d: "Structured, exam-focused teaching for WAEC, JAMB, IGCSE, SAT, A-Levels and KS2/KS3." },
  { t: "Coding & technology", d: "Python, web development and beginner-friendly artificial intelligence through hands-on projects." },
];

const STEPS = [
  { t: "Register", d: "Complete the enrolment form and choose a package — it takes only a few minutes." },
  { t: "We review", d: "We review the registration and set up the learner's account." },
  { t: "Get access", d: "The Student ID and password arrive by email, along with a short aptitude test." },
  { t: "Start learning", d: "Join live online sessions from home and watch progress climb in the portal." },
];

export default function ProgrammesPage() {
  return (
    <MarketingShell>
      <PageHeader eyebrow="Programmes" title="What we offer"
        lead="Tailored online tuition across the subjects that matter — taught live, tracked closely, and aligned to your child's goals." />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          {SERVICES.map(s => (
            <div key={s.t} className="rounded-2xl border border-line bg-white p-6">
              <h2 className="font-display text-lg font-bold text-ink">{s.t}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink/60">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ink/55">
          See rates on the <Link href="/pricing" className="font-semibold text-gold-deep hover:underline">pricing page</Link> — tuition is charged per hour and billed monthly from attendance.
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-line bg-chalk/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-center font-display text-2xl font-bold text-ink md:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-2xl border border-line bg-white p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-display text-base font-bold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink/55">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 text-center">
            <Link href="/apply" className="btn-gold inline-flex !min-h-[48px] !rounded-full !px-8">Register now</Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
