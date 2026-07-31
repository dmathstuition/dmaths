import Mascot from "@/components/Mascot";

// A large character mascot for the dashboard heroes, with the soft blue halo
// behind it (as in the app mockups). `className` sizes/positions the whole unit;
// the mascot fills it and the halo sits behind the upper body.
export default function HeroMascot({
  src,
  alt = "",
  fallback = null,
  className = "",
}: {
  src: string;
  alt?: string;
  fallback?: React.ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none select-none ${className}`}>
      <div className="relative h-full w-full">
        {/* soft blue halo behind the character's head/shoulders */}
        <span
          className="absolute left-1/2 top-[6%] aspect-square w-[94%] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, #C9DEF7 0%, #DCE9F9 48%, rgba(220,233,249,0) 72%)" }}
        />
        {/* little accent dots, like the mockup */}
        <span className="absolute left-[8%] top-[46%] h-2.5 w-2.5 rounded-full bg-[#9BC0EA]" />
        <span className="absolute left-[3%] top-[57%] h-1.5 w-1.5 rounded-full bg-[#B8D2F0]" />
        {/* the character */}
        <Mascot
          src={src}
          alt={alt}
          fallback={fallback}
          className="mascot-bob relative h-full w-full object-contain object-bottom drop-shadow-xl"
        />
      </div>
    </div>
  );
}
