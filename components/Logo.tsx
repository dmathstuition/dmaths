import Image from "next/image";

export default function Logo({ light }: { light?: boolean }) {
  return (
    <Image
      src="/dmathslogo.png"
      alt="D-Maths Tuition Centre"
      width={140}
      height={40}
      priority
      className={`h-9 w-auto ${light ? "brightness-0 invert" : ""}`}
    />
  );
}
