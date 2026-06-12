import Link from "next/link";
import Logo from "@/components/Logo";

export default function LegalPage({ title, updated, children }: {
  title: string; updated: string; children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-chalk">
      <nav className="glass-dark sticky top-0 z-50 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/"><Logo light /></Link>
          <Link href="/" className="text-sm font-semibold text-white/60 hover:text-white">← Back to home</Link>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink/40">Last updated: {updated}</p>
        <div className="legal-body mt-8 space-y-6 text-[15px] leading-relaxed text-ink/75">
          {children}
        </div>
      </main>
      <footer className="border-t border-line py-8 text-center text-xs text-ink/40">
        D-Maths Tuition Centre · dmathstuition@gmail.com
      </footer>
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold text-ink pt-4">{children}</h2>;
}
