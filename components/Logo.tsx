import Image from "next/image";

// size: "sm" (compact) | "md" (default) | "lg" (sidebar / nav / hero)
// mark: use the emblem only (the N mark, no wordmark) — used inside the portal.
// The full lockup is a near-square stacked image; the emblem is square.
// On dark surfaces pass `light` to render a white version of the full lockup.
export default function Logo({ light, size = "md", mark = false }: { light?: boolean; size?: "sm" | "md" | "lg"; mark?: boolean }) {
  const h = size === "lg" ? "h-14" : size === "sm" ? "h-9" : "h-11";
  const src = mark ? "/novelia-mark.png" : "/novelia-logo.png";
  const dims = mark
    ? (size === "lg" ? { width: 150, height: 155 } : { width: 96, height: 99 })
    : (size === "lg" ? { width: 200, height: 182 } : { width: 132, height: 120 });
  return (
    <Image
      src={src}
      alt="Novelia Academy"
      {...dims}
      priority
      className={`${h} w-auto ${light ? "brightness-0 invert" : ""}`}
    />
  );
}
