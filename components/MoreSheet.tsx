"use client";
import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";

export type MoreItem = { href: string; label: string; icon: IconName };

// A bottom sheet that arranges the full navigation as a grid of icon tiles
// (app-launcher style) — the mobile "More" menu. Replaces the long sidebar
// list with something you can scan at a glance.
export default function MoreSheet({
  items, path, open, onClose, name, onSignOut,
}: {
  items: MoreItem[];
  path: string;
  open: boolean;
  onClose: () => void;
  name: string;
  onSignOut: () => void;
}) {
  const isActive = (href: string) =>
    path === href || (href.length > 1 && path.startsWith(href + "/"));

  return (
    <div
      className={`fixed inset-0 z-[60] lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* sheet */}
      <div
        role="dialog"
        aria-label="More menu"
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-board ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* grab handle */}
        <div className="sticky top-0 z-10 flex flex-col items-center bg-white pt-2.5 dark:bg-board">
          <span className="h-1.5 w-10 rounded-full bg-ink/15 dark:bg-white/20" />
          <div className="mt-2 flex w-full items-center justify-between px-5 pb-2">
            <div className="min-w-0">
              <p className="font-display text-base font-bold text-ink dark:text-white">Menu</p>
              <p className="truncate text-[11px] text-ink/45 dark:text-white/40">{name}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-chalk text-ink/60 dark:bg-white/10 dark:text-white/70"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>

        {/* grid of tiles */}
        <div className="grid grid-cols-4 gap-2 px-3 pt-1 sm:grid-cols-5">
          {items.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onClose}
                className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition ${
                  active
                    ? "bg-gold-pale dark:bg-gold/15"
                    : "hover:bg-chalk active:bg-chalk dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    active
                      ? "bg-gold text-board"
                      : "bg-chalk text-ink/70 dark:bg-white/10 dark:text-white/75"
                  }`}
                >
                  <Icon name={n.icon} className="h-5 w-5" />
                </span>
                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    active ? "text-gold-deep dark:text-gold" : "text-ink/60 dark:text-white/55"
                  }`}
                >
                  {n.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* footer actions */}
        <div className="mt-3 flex items-center gap-2 border-t border-line px-4 pt-3 dark:border-white/10">
          <div className="flex-1"><ThemeToggle /></div>
          <button
            onClick={() => { onClose(); onSignOut(); }}
            className="flex items-center gap-2 rounded-xl bg-chalk px-4 py-2.5 text-sm font-bold text-ink/70 transition hover:bg-red-50 hover:text-red-600 dark:bg-white/10 dark:text-white/70"
          >
            <Icon name="signout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
