import Image from "next/image";

// size: "sm" (compact) | "md" (default) | "lg" (sidebar / nav / hero)
// The Novelia logo is a near-square stacked lockup (emblem + wordmark). On dark
// surfaces pass `light` to render it as a clean white version.
export default function Logo({ light, size = "md" }: { light?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-14" : size === "sm" ? "h-9" : "h-11";
  const dims = size === "lg" ? { width: 200, height: 182 } : { width: 132, height: 120 };
  return (
    <Image
      src="/novelia-logo.png"
      alt="Novelia Academy"
      {...dims}
      priority
      className={`${h} w-auto ${light ? "brightness-0 invert" : ""}`}
    />
  );
}
