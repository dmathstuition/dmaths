// Decorative "math in motion" layer — slowly drifting brand-coloured math
// glyphs behind the homepage hero. Purely ornamental: aria-hidden and
// pointer-events-none so it never affects screen readers or interaction.
// The .drift animation is disabled under prefers-reduced-motion (globals.css),
// leaving the symbols sitting statically at low opacity.

const GOLD = "#EFAE56";
const BLUE = "#1A60AB";

type Glyph = {
  s: string;   // the symbol
  top: string;
  left: string;
  size: string; // font-size
  color: string;
  opacity: number;
  delay: string;
  duration: string;
};

const GLYPHS: Glyph[] = [
  { s: "∑",    top: "12%", left: "6%",  size: "3.5rem", color: BLUE, opacity: 0.12, delay: "0s",   duration: "9s" },
  { s: "π",    top: "62%", left: "9%",  size: "2.75rem", color: GOLD, opacity: 0.18, delay: "1.2s", duration: "10s" },
  { s: "√",    top: "30%", left: "16%", size: "2.25rem", color: BLUE, opacity: 0.10, delay: "2.4s", duration: "8s" },
  { s: "∫",    top: "78%", left: "22%", size: "3rem",   color: GOLD, opacity: 0.12, delay: "0.6s", duration: "11s" },
  { s: "ƒ(x)", top: "16%", left: "52%", size: "2rem",   color: BLUE, opacity: 0.09, delay: "1.8s", duration: "9.5s" },
  { s: "∞",    top: "70%", left: "60%", size: "3.25rem", color: GOLD, opacity: 0.10, delay: "3s",   duration: "10.5s" },
  { s: "Δ",    top: "10%", left: "86%", size: "2.75rem", color: GOLD, opacity: 0.16, delay: "0.9s", duration: "8.5s" },
  { s: "θ",    top: "44%", left: "92%", size: "2.5rem",  color: BLUE, opacity: 0.11, delay: "2s",   duration: "9s" },
  { s: "%",    top: "84%", left: "88%", size: "2.25rem", color: BLUE, opacity: 0.10, delay: "1.4s", duration: "10s" },
];

export default function FloatingMath({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {GLYPHS.map((g, i) => (
        <span
          key={i}
          className="drift absolute select-none font-mono font-bold"
          style={{
            top: g.top,
            left: g.left,
            fontSize: g.size,
            color: g.color,
            opacity: g.opacity,
            animationDelay: g.delay,
            animationDuration: g.duration,
          }}
        >
          {g.s}
        </span>
      ))}
    </div>
  );
}
