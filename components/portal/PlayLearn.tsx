import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

type Tile = { href: string; label: string; sub: string; icon: IconName; from: string; to: string; emoji: string };

// A playful launcher for the fun ways to learn — surfaces the games & tools that
// otherwise live deep in the nav, with a bit of colour and motion.
const TILES: Tile[] = [
  { href: "/portal/practice",  label: "Practice",    sub: "Earn points",    icon: "target",        from: "#1A60AB", to: "#0A2A4F", emoji: "🎯" },
  { href: "/portal/sprint",    label: "Math Sprint", sub: "Beat the clock", icon: "zap",           from: "#7C3AED", to: "#4C1D95", emoji: "⚡" },
  { href: "/portal/mathle",    label: "Mathle",      sub: "Daily puzzle",   icon: "sigma",         from: "#0E9488", to: "#0B4A44", emoji: "🧩" },
  { href: "/portal/duel",      label: "Quiz Duel",   sub: "Challenge a pal",icon: "students",      from: "#EA580C", to: "#7C2D12", emoji: "⚔️" },
  { href: "/portal/boss",      label: "Boss Battle", sub: "Weekly boss",    icon: "trophy",        from: "#DC2626", to: "#7F1D1D", emoji: "🐉" },
  { href: "/portal/flashcards",label: "Revision",    sub: "Flip & learn",   icon: "book",          from: "#059669", to: "#064E3B", emoji: "📚" },
];

export default function PlayLearn() {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon name="sparkles" className="h-4 w-4 text-gold-deep" />
        <h2 className="font-display text-lg font-semibold text-ink">Play &amp; learn</h2>
        <span className="text-sm text-ink/45">— pick one and go</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map((t, i) => (
          <Link key={t.href} href={t.href}
            style={{ background: `linear-gradient(140deg, ${t.from}, ${t.to})`, animationDelay: `${i * 60}ms` }}
            className="tile-pop group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lift">
            <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 text-5xl opacity-15 transition-transform duration-300 group-hover:scale-110">{t.emoji}</span>
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Icon name={t.icon} className="h-5 w-5" />
            </span>
            <div className="relative mt-4">
              <p className="font-display text-sm font-bold leading-tight">{t.label}</p>
              <p className="text-[11px] font-semibold text-white/70">{t.sub}</p>
            </div>
            <span aria-hidden className="tile-shine pointer-events-none absolute inset-0" />
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes tilePop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
        .tile-pop { animation: tilePop .5s both; }
        .tile-shine { background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.25) 50%, transparent 70%); transform: translateX(-120%); }
        .tile-pop:hover .tile-shine { transition: transform .7s ease; transform: translateX(120%); }
        @media (prefers-reduced-motion: reduce) { .tile-pop { animation: none; } .tile-shine { display: none; } }
      `}</style>
    </div>
  );
}
