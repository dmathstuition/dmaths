// A consistent, on-brand avatar for anyone in the portal. There are no uploaded
// profile photos, so we render the person's initials on a gradient that is
// derived deterministically from their name — the same person always gets the
// same colour, everywhere they appear (sidebar, headers, activity feeds, lists).

const GRADIENTS = [
  "from-[#1A60AB] to-[#0F3A6B]", // brand blue
  "from-[#EFAE56] to-[#C8881F]", // gold
  "from-[#7BA3CA] to-[#1A60AB]", // sky → blue
  "from-[#2FB39B] to-[#0F766E]", // teal
  "from-[#8B5CF6] to-[#5B3FB0]", // violet
  "from-[#F0763B] to-[#C8501F]", // coral
  "from-[#10B981] to-[#047857]", // emerald
  "from-[#3B82F6] to-[#1D4ED8]", // azure
];

const SIZES: Record<string, string> = {
  xs: "h-8 w-8 text-[11px]",
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Stable string hash → gradient index, so colours are consistent between renders.
function pick(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

export default function Avatar({
  name,
  size = "md",
  ring = false,
  className = "",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ring?: boolean;
  className?: string;
}) {
  const label = (name || "").trim() || "User";
  return (
    <span
      aria-hidden
      title={label}
      className={`inline-flex flex-shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white shadow-sm ${pick(label)} ${SIZES[size]} ${ring ? "ring-2 ring-white/70 dark:ring-white/15" : ""} ${className}`}
    >
      {initials(label)}
    </span>
  );
}
