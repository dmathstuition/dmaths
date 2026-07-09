import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import PythonIde from "@/components/code/PythonIde";

export const metadata: Metadata = {
  title: "Python Playground — D-Maths Online",
  description: "Write and run real Python right in your browser — no install, no sign-up. A free taste of coding at D-Maths.",
};

export default function Playground() {
  return (
    <main className="min-h-screen bg-white font-body text-ink">
      <header className="bg-board px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-semibold text-white/55 hover:text-white">← Home</Link>
            <Link href="/apply" className="btn-gold !min-h-[38px] !rounded-full !px-5 !text-sm">Enroll</Link>
          </div>
        </div>
      </header>

      <section className="mesh-premium">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/70 px-4 py-1.5 text-xs font-bold text-gold-deep shadow-sm backdrop-blur">
            <span className="badge-pulse h-1.5 w-1.5 rounded-full bg-gold-deep" />
            Free · runs in your browser
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Python <span className="text-gradient-gold">Playground</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/55">
            Write real Python and run it instantly — nothing to install, no account needed. This is a
            taste of the coding learners do at D-Maths. Want to save your work and learn properly?{" "}
            <Link href="/apply" className="font-semibold text-gold-deep hover:underline">Enroll here</Link>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <PythonIde />
        <p className="mt-4 text-xs text-ink/40">
          The first run downloads the Python engine (a few seconds), then it's instant. Your code never
          leaves your device. Note: <code>input()</code> and on-screen charts aren't supported here yet —
          use <code>print()</code> to see results.
        </p>
      </section>

      <footer className="bg-gold py-4 text-center text-xs font-semibold text-white">
        © {new Date().getFullYear()} D-Maths Tuition Centre · Learn to code with us
      </footer>
    </main>
  );
}
