import Image from "next/image";

// size: "sm" (compact) | "md" (default) | "lg" (sidebar / nav / hero)
export default function Logo({ light, size = "md" }: { light?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-16" : size === "sm" ? "h-10" : "h-12";
  const dims = size === "lg" ? { width: 300, height: 86 } : { width: 220, height: 62 };
  return (
    <Image
      src="/dmathslogo.png"
      alt="D-Maths Tuition Centre"
      {...dims}
      priority
      className={`${h} w-auto ${light ? "brightness-0 invert" : ""}`}
    />
  );
}
