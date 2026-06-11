"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export type NavItem = { href: string; label: string; icon: string };

export default function PortalShell({
  nav, name, subtitle, children,
}: { nav: NavItem[]; name: string; subtitle: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-board text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" className="font-display text-xl font-bold">D-Maths</Link>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[.18em] text-white/30">{subtitle}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(n => {
          const active = path === n.href;
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition
                ${active ? "bg-gold text-board" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>
              <span aria-hidden>{n.icon}</span>{n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="mb-2 truncate px-2 text-sm font-bold text-white/80">{name}</p>
        <button onClick={signOut} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white/40 hover:bg-white/10 hover:text-white">
          ↩ Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-chalk">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-board px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg bg-white/10 px-3 py-2 text-white">☰</button>
        <span className="font-display font-bold text-white">D-Maths</span>
        <span className="w-10" />
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">{sidebar}</div>
        </div>
      )}

      <main className="px-4 py-7 sm:px-7 lg:ml-64 lg:px-10">{children}</main>
    </div>
  );
}
