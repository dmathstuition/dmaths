"use client";
import { useEffect, useRef } from "react";

// Subtle mouse-driven 3D tilt for a cinematic feel — GPU transforms only, throttled
// with requestAnimationFrame. Skipped on touch/coarse pointers and when the user
// prefers reduced motion, so phones (and low-end devices) never pay for it.
export default function Tilt3D({ children, className = "", max = 9 }: {
  children: React.ReactNode; className?: string; max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const parent = el.parentElement ?? el;
    let raf = 0, rx = 0, ry = 0;
    const apply = () => { raf = 0; el.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`; };
    const onMove = (e: MouseEvent) => {
      const r = parent.getBoundingClientRect();
      rx = -((e.clientY - r.top) / r.height - 0.5) * max;
      ry = ((e.clientX - r.left) / r.width - 0.5) * max;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const reset = () => {
      if (raf) cancelAnimationFrame(raf), (raf = 0);
      el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    };
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", reset);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", reset);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [max]);

  return (
    <div ref={ref} className={className}
      style={{ transformStyle: "preserve-3d", transition: "transform .3s cubic-bezier(.2,.6,.2,1)", willChange: "transform" }}>
      {children}
    </div>
  );
}
