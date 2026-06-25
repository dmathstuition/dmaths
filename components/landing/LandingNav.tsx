"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

const NAV_LINKS = [
  ["#services", "Services"],
  ["#how", "How it works"],
  ["#agency", "About"],
  ["#results", "Results"],
  ["#contact", "Contact"],
] as const;

const SECTION_IDS = ["services", "how", "agency", "results", "contact"];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(`#${id}`); },
        { rootMargin: "-40% 0px -55% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-white/85 backdrop-blur-lg transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_20px_rgba(26,96,171,.10)]" : ""
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        <Logo size="lg" />
        <div className="hidden gap-1 md:flex">
          {NAV_LINKS.map(([h, l]) => (
            <a
              key={h}
              href={h}
              className={`rounded-full px-4 py-2 text-sm font-medium transition hover:bg-chalk hover:text-ink ${
                active === h ? "text-gold-deep font-semibold" : "text-ink/60"
              }`}
            >
              {l}
            </a>
          ))}
        </div>
        <Link href="/apply" className="btn-gold !min-h-[40px] !rounded-full !px-5">
          Sign up
        </Link>
      </div>
    </nav>
  );
}
