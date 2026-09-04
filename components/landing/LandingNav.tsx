"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

// A clean, route-based top nav for the public site. Each item is a real page,
// so the marketing site reads like a branded academic website rather than one
// long scroll.
const LINKS = [
  ["/", "Home"],
  ["/about", "About"],
  ["/programmes", "Programmes"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
] as const;

export default function LandingNav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b bg-white/70 backdrop-blur-xl backdrop-saturate-150 transition-shadow ${scrolled ? "border-white/60 shadow-sm" : "border-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center" aria-label="D-Maths home"><Logo size="lg" /></Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href}
              className={`rounded-md px-3.5 py-2 text-sm font-semibold transition ${
                isActive(href) ? "text-gold-deep" : "text-ink/60 hover:text-ink"}`}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink/70 transition hover:text-ink sm:inline-block">Sign in</Link>
          <Link href="/apply" className="btn-gold !min-h-[40px] !rounded-full !px-5 !text-sm">Register</Link>
          <button onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink/70 hover:bg-chalk md:hidden">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <div className="mx-auto max-w-6xl px-5 py-2">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive(href) ? "bg-gold-pale text-gold-deep" : "text-ink/70 hover:bg-chalk"}`}>
                {label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink/70 hover:bg-chalk">Sign in</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
