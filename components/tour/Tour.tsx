"use client";
import { useCallback, useEffect, useState } from "react";

export type TourStep = {
  target: string;              // matches a data-tour="<target>" attribute
  title: string;
  body: string;
  placement?: "top" | "bottom";
};

// A lightweight, dependency-free spotlight tour. It dims the screen, cuts a
// "hole" around one real element at a time (via the box-shadow trick), and shows
// a tooltip. Shows once per tourId (localStorage), and can be replayed by
// dispatching a `dmaths:start-tour` window event (see TourButton).
const PAD = 8;

export const startTourEvent = "dmaths:start-tour";

export default function Tour({ tourId, steps }: { tourId: string; steps: TourStep[] }) {
  const doneKey = `dmaths-tour-${tourId}-done`;
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState<TourStep[]>([]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const start = useCallback(() => {
    const vis = steps.filter((s) => document.querySelector(`[data-tour="${s.target}"]`));
    if (!vis.length) return;
    setVisible(vis);
    setI(0);
    setActive(true);
  }, [steps]);

  const finish = useCallback(() => {
    setActive(false);
    setRect(null);
    try { localStorage.setItem(doneKey, "1"); } catch {}
  }, [doneKey]);

  // Auto-start once, on the first visit, after the page has painted.
  useEffect(() => {
    let done = false;
    try { done = !!localStorage.getItem(doneKey); } catch {}
    if (done) return;
    const t = setTimeout(start, 650);
    return () => clearTimeout(t);
  }, [doneKey, start]);

  // Replay trigger from anywhere (the "Tour" button).
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener(startTourEvent, onStart);
    return () => window.removeEventListener(startTourEvent, onStart);
  }, [start]);

  const step = active ? visible[i] : undefined;

  // Measure the current target (and keep it measured through scroll/resize).
  useEffect(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) { // target vanished — skip it
      setI((prev) => (prev < visible.length - 1 ? prev + 1 : prev));
      if (i >= visible.length - 1) finish();
      return;
    }
    try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch { /* jsdom / unsupported */ }
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 380); // re-measure once the smooth-scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, i, visible.length, finish]);

  const next = useCallback(() => setI((p) => {
    if (p < visible.length - 1) return p + 1;
    finish();
    return p;
  }), [visible.length, finish]);
  const prev = useCallback(() => setI((p) => Math.max(0, p - 1)), []);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, finish]);

  if (!active || !step || !rect) return null;

  const total = visible.length;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom;
  const below = step.placement ? step.placement === "bottom" : spaceBelow > 240;

  const TIP_W = Math.min(340, vw - 24);
  let left = rect.left + rect.width / 2 - TIP_W / 2;
  left = Math.max(12, Math.min(left, vw - TIP_W - 12));
  const top = below ? rect.bottom + PAD + 14 : rect.top - PAD - 14;

  return (
    <>
      {/* click-catcher: clicking the dimmed area advances the tour */}
      <div className="fixed inset-0 z-[75]" onClick={next} aria-hidden="true" />

      {/* spotlight cut-out around the target */}
      <div
        className="tour-ring pointer-events-none fixed z-[76] rounded-2xl"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          boxShadow: "0 0 0 9999px rgba(10,31,61,.72)",
        }}
      />

      {/* tooltip */}
      <div
        role="dialog"
        aria-label={step.title}
        className="fixed z-[77] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-black/5"
        style={{
          width: TIP_W,
          left,
          top,
          transform: below ? "none" : "translateY(-100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gold-deep">
            Step {i + 1} of {total}
          </span>
          <button onClick={finish} className="text-xs font-semibold text-ink/40 hover:text-ink" aria-label="Skip tour">
            Skip
          </button>
        </div>
        <h3 className="mt-2 font-display text-lg font-bold text-ink">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {visible.map((_, d) => (
              <span key={d} className={`h-1.5 rounded-full transition-all ${d === i ? "w-5 bg-gold" : "w-1.5 bg-line"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button onClick={prev} className="btn !min-h-[38px] border border-line bg-white !px-4 !text-sm text-ink/70 hover:bg-chalk">
                Back
              </button>
            )}
            <button onClick={next} className="btn-gold !min-h-[38px] !px-5 !text-sm">
              {i === total - 1 ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
