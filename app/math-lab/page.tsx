import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import MathLab from "@/components/math/MathLab";

export const metadata: Metadata = {
  title: "Math Lab — D-Maths Online",
  description: "Type any formula and watch it render and solve live — powers, roots, trig, and even units and conversions. Free, right in your browser.",
};

export default function MathLabPublic() {
  return (
    <main className="min-h-screen bg-white font-body text-ink">
      <header className="bg-board px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/playground" className="font-semibold text-white/55 hover:text-white">Code Playground</Link>
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
            Math <span className="text-gradient-gold">Lab</span>
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink/55">
            Type any formula and watch it render and solve instantly — powers, roots, trig, and even real
            units like <span className="font-mono">9.81 m/s^2 * 70 kg</span> → <span className="font-semibold text-gold-deep">686.7 N</span>.{" "}
            <Link href="/apply" className="font-semibold text-gold-deep hover:underline">Enroll</Link> to save your work.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <MathLab />
        <p className="mt-4 text-xs text-ink/40">
          Everything is worked out on your device. Use <span className="font-mono">to</span> /{" "}
          <span className="font-mono">in</span> to convert units (e.g. <span className="font-mono">2 inch to cm</span>),
          and assign variables across lines (<span className="font-mono">r = 3</span>).
        </p>
      </section>

      <footer className="bg-gold py-4 text-center text-xs font-semibold text-white">
        © {new Date().getFullYear()} D-Maths Tuition Centre · Learn maths with us
      </footer>
    </main>
  );
}
