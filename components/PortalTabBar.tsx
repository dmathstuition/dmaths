"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

export type Tab = { href: string; label: string; icon: IconName };

// Native-app style bottom tab bar (mobile only). Shows up to 5 primary tabs
// plus a "More" button that opens the full-menu drawer, so nothing is lost.
export default function PortalTabBar({
  tabs, path, onMore,
}: {
  tabs: Tab[];
  path: string;
  onMore: () => void;
}) {
  const isActive = (href: string) =>
    path === href || (href.length > 1 && path.startsWith(href + "/"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/90 backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-board/90"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
                active ? "text-gold-deep dark:text-gold" : "text-ink/45 dark:text-white/45"
              }`}
            >
              <span className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                active ? "bg-gold-pale dark:bg-gold/15" : ""
              }`}>
                <Icon name={t.icon} className="h-5 w-5" />
              </span>
              {t.label}
            </Link>
          );
        })}
        <button
          onClick={onMore}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold text-ink/45 transition-colors hover:text-ink dark:text-white/45"
          aria-label="More menu"
        >
          <span className="flex h-7 w-11 items-center justify-center rounded-full">
            <Icon name="grid" className="h-5 w-5" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
