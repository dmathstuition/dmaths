"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/Icons";
import type { NavItem } from "@/components/PortalShell";

// A ⌘/Ctrl+K command palette: type to jump to any section instantly, with
// keyboard navigation. Sourced from the current role's nav, so it works the
// same in the student, tutor and admin shells. A header button opens it too
// (for touch devices without a keyboard).
export default function CommandPalette({ nav }: { nav: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘/Ctrl+K to toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    (window as any).__openCommandPalette = () => setOpen(true);
    return () => { window.removeEventListener("keydown", onKey); delete (window as any).__openCommandPalette; };
  }, []);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return nav;
    return nav.filter((n) => n.label.toLowerCase().includes(needle));
  }, [q, nav]);

  useEffect(() => { setActive(0); }, [q]);

  function go(item: NavItem) { setOpen(false); router.push(item.href); }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[active]) go(results[active]); }
  }

  return (
    <>
      {/* Header trigger (also usable on touch) */}
      <button onClick={() => setOpen(true)} aria-label="Open command palette (Ctrl or Cmd + K)"
        className="hidden items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white sm:flex">
        <Icon name="search" className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Jump to…</span>
        <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-board/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-board">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3 dark:border-white/10">
              <Icon name="search" className="h-4 w-4 text-ink/40" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Jump to a section…" aria-label="Search sections"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-ink/35 dark:text-white" />
              <kbd className="rounded bg-chalk px-1.5 py-0.5 font-mono text-[10px] text-ink/45 dark:bg-white/10 dark:text-white/50">Esc</kbd>
            </div>
            <ul className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink/40">No matches.</li>}
              {results.map((n, i) => (
                <li key={n.href}>
                  <button onMouseEnter={() => setActive(i)} onClick={() => go(n)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      i === active ? "bg-gold-pale text-gold-deep dark:bg-gold/15 dark:text-gold" : "text-ink/70 dark:text-white/70"}`}>
                    <Icon name={n.icon as IconName} className="h-4 w-4 opacity-70" />
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
