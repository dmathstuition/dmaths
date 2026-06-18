import Image from "next/image";

// size: "sm" (nav bars) | "md" (default) | "lg" (sidebar / hero)
export default function Logo({ light, size = "md" }: { light?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? "h-14" : size === "sm" ? "h-9" : "h-11";
  const dims = size === "lg" ? { width: 260, height: 74 } : { width: 200, height: 56 };
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
