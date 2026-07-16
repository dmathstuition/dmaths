"use client";
import { useEffect, useRef } from "react";

// Cheap scroll parallax: translates an element by a fraction of the scroll offset,
// transform-only and rAF-throttled so it stays smooth. No-op under reduced motion.
export default function Parallax({ children, speed = 0.18, className = "" }: {
  children: React.ReactNode; speed?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.transform = `translate3d(0, ${window.scrollY * speed}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [speed]);

  return <div ref={ref} className={className} style={{ willChange: "transform" }}>{children}</div>;
}
