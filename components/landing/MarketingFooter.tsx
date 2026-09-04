import Link from "next/link";
import SocialLinks from "@/components/landing/SocialLinks";

function Col({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-bold text-ink">{title}</h4>
      <ul className="mt-3 space-y-2 text-[13px] text-ink/55">
        {links.map(([l, h]) => <li key={l}><Link href={h} className="hover:text-gold-deep">{l}</Link></li>)}
      </ul>
    </div>
  );
}

export default function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-white pt-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold text-ink">D-Maths</p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-ink/55">
            A virtual learning community delivering world-class online tuition in maths, sciences
            and coding worldwide — with prep for WAEC, JAMB, IGCSE, SAT and A-Levels.
          </p>
        </div>
        <Col title="Explore" links={[["About", "/about"], ["Programmes", "/programmes"], ["Pricing", "/pricing"], ["Contact", "/contact"]]} />
        <Col title="Get started" links={[["Register", "/apply"], ["Sign in", "/login"], ["Help & FAQ", "/help"]]} />
        <Col title="Legal" links={[["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Payment & Refunds", "/refunds"], ["Delete account", "/delete-account"]]} />
      </div>
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center gap-3 border-t border-line py-6 sm:flex-row sm:justify-between">
          <p className="text-sm font-semibold text-ink/55">Follow D-Maths</p>
          <SocialLinks className="justify-center" />
        </div>
      </div>
      <div className="bg-board py-4 text-center text-xs font-semibold text-white/80">
        © {new Date().getFullYear()} D-Maths Tuition Centre · support@dmaths.academy · Asaba, Delta State
      </div>
    </footer>
  );
}
