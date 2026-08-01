import { Icon, type IconName } from "@/components/Icons";

// A modern, consistent page header — the dark "arena" gradient with an icon
// badge, title, subtitle and optional right-side actions, plus faint floating
// decoration. Server-safe (no client hooks), so it drops into any page.
export default function PageHero({
  icon, title, subtitle, decor = [], children,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  decor?: IconName[];
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
      style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
      {decor[0] && <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name={decor[0]} className="h-6 w-6" /></div>}
      {decor[1] && <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name={decor[1]} className="h-5 w-5" /></div>}

      <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="relative min-w-0 flex-1">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {children && <div className="relative">{children}</div>}
    </div>
  );
}
