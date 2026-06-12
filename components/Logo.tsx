export default function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold font-display text-lg font-bold text-board">∑</div>
      <div>
        <div className={`font-display text-lg font-bold leading-none ${light ? "text-white" : "text-ink"}`}>D-Maths</div>
        <div className={`font-mono text-[8px] uppercase tracking-[.2em] ${light ? "text-white/35" : "text-ink/40"}`}>Tuition Centre</div>
      </div>
    </div>
  );
}
