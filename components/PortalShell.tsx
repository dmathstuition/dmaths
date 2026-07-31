"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, type IconName } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import AdminSearch from "@/components/admin/AdminSearch";
import PushManager from "@/components/PushManager";
import PortalTabBar, { type Tab } from "@/components/PortalTabBar";
import CommandPalette from "@/components/CommandPalette";
import MoreSheet from "@/components/MoreSheet";
import IdleLogout from "@/components/IdleLogout";
import TourButton from "@/components/tour/TourButton";
import ConnectionStatus from "@/components/ConnectionStatus";
import { useDialog } from "@/lib/useDialog";

export type NavItem = { href: string; label: string; icon: IconName };

export default function PortalShell({
  nav, name, subtitle, children, bell, search, tabs, idleMinutes = 30, avatarSrc,
}: {
  nav: NavItem[]; name: string; subtitle: string; children: React.ReactNode;
  bell?: { mode: "student" | "admin"; subjects?: string[]; noticesHref: string };
  search?: boolean;
  tabs?: Tab[];
  idleMinutes?: number;
  avatarSrc?: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // The mobile drawer is a dialog: Esc closes it, Tab stays inside, focus goes
  // back to the hamburger.
  useDialog(open, () => setOpen(false), drawerRef);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-board/95 text-white backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/"><Logo light size="lg" /></Link>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/30">{subtitle}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(n => {
          const active = path === n.href || (n.href.includes("/", 1) && path.startsWith(n.href + "/"));
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200
                ${active ? "bg-gold text-board shadow-lg shadow-gold/25" : "text-white/55 hover:bg-white/10 hover:text-white hover:translate-x-0.5"}`}>
              <Icon name={n.icon} className={active ? "" : "opacity-70 group-hover:opacity-100"} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={name} size="md" ring src={avatarSrc} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{name.trim() || "there"}</p>
            <p className="truncate text-[11px] font-semibold text-white/40">{subtitle}</p>
          </div>
        </div>
        <ThemeToggle />
        <button onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white/40 transition hover:bg-white/10 hover:text-white">
          <Icon name="signout" className="opacity-70" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="portal-bg min-h-screen">
      {/* First stop for a keyboard user: jump past the nav straight to the page. */}
      <a href="#main" className="skip-link">Skip to main content</a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Top bar — app-style on mobile (hamburger · logo · bell · avatar),
          transparent on desktop where the sidebar carries the brand. */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-chalk/85 px-4 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-board/85 lg:ml-64 lg:border-0 lg:bg-transparent lg:px-10 lg:py-4 lg:backdrop-blur-none dark:lg:bg-transparent">
        {/* mobile: brand + subtitle (menu only when there's no bottom tab bar,
            since the tabs + "More" sheet already cover navigation) */}
        <div className="flex items-center gap-2 lg:hidden">
          {!tabs && (
            <button onClick={() => setOpen(true)} aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink/70 transition hover:bg-ink/5 dark:text-white dark:hover:bg-white/10">
              <Icon name="menu" />
            </button>
          )}
          <Link href="/" className="flex flex-col justify-center leading-none">
            <span className="dark:brightness-0 dark:invert"><Logo size="sm" /></span>
            <span className="mt-0.5 pl-0.5 font-mono text-[9px] uppercase tracking-[.16em] text-ink/40 dark:text-white/40">{subtitle}</span>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden lg:block"><CommandPalette nav={nav} /></span>
          <span className="hidden lg:block"><TourButton light /></span>
          {search && <span data-tour="search" className="hidden lg:block"><AdminSearch /></span>}
          {bell && <span data-tour="bell"><NotificationBell mode={bell.mode} subjects={bell.subjects} noticesHref={bell.noticesHref} /></span>}
          <Avatar name={name} size="sm" ring src={avatarSrc} />
        </div>
      </header>

      {/* Mobile drawer — only when there's no bottom tab bar (otherwise the tabs
          + "More" sheet handle navigation and the drawer is redundant). */}
      {!tabs && (
        <div className={`fixed inset-0 z-50 transition-[opacity,visibility] duration-200 lg:hidden ${open ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu"
            className={`absolute inset-y-0 left-0 w-72 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
            {sidebar}
            <button onClick={() => setOpen(false)} aria-label="Close menu"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white">
              <Icon name="close" />
            </button>
          </div>
        </div>
      )}

      <main id="main" tabIndex={-1} className={`overflow-x-clip px-4 pt-4 sm:px-7 lg:ml-64 lg:px-10 lg:pb-10 ${tabs ? "pb-28" : "pb-10"}`}>{children}</main>

      {/* App-style bottom tab bar (mobile only) */}
      {tabs && <PortalTabBar tabs={tabs} path={path} onMore={() => setMoreOpen(true)} />}

      {/* "More" — full navigation as a grid of tiles (mobile only) */}
      {tabs && (
        <MoreSheet items={nav} path={path} open={moreOpen} onClose={() => setMoreOpen(false)}
          name={name} onSignOut={signOut} />
      )}

      <PushManager />
      <IdleLogout minutes={idleMinutes} />
      <ConnectionStatus />
    </div>
  );
}
