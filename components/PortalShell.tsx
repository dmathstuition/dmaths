"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon, type IconName } from "@/components/Icons";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

export type NavItem = { href: string; label: string; icon: IconName };

export default function PortalShell({
  nav, name, subtitle, children, bell,
}: {
  nav: NavItem[]; name: string; subtitle: string; children: React.ReactNode;
  bell?: { mode: "student" | "admin"; subjects?: string[]; noticesHref: string };
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    window.location.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-board/95 text-white backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/"><Logo light /></Link>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[.18em] text-white/30">{subtitle}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(n => {
          const active = path === n.href;
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
        <p className="mb-2 truncate px-2 text-sm font-bold text-white/80">{name}</p>
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
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Top bar — visible on every screen size; holds the notification bell */}
      <header className="glass-dark sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:ml-64 lg:bg-transparent lg:px-10 lg:backdrop-blur-none">
        {/* mobile: hamburger; desktop: page area title spacer */}
        <button onClick={() => setOpen(true)} aria-label="Open menu"
          className="rounded-lg bg-white/10 p-2.5 text-white lg:hidden">
          <Icon name="menu" />
        </button>
        <span className="font-display font-bold text-white lg:hidden">D-Maths</span>

        <div className="ml-auto flex items-center gap-2">
          {bell && <NotificationBell mode={bell.mode} subjects={bell.subjects} noticesHref={bell.noticesHref} />}
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-72 transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
          <button onClick={() => setOpen(false)} aria-label="Close menu"
            className="absolute right-3 top-4 rounded-lg bg-white/10 p-2 text-white">
            <Icon name="close" />
          </button>
        </div>
      </div>

      <main className="px-4 pb-10 pt-4 sm:px-7 lg:ml-64 lg:px-10">{children}</main>
    </div>
  );
}
