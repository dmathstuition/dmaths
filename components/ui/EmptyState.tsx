import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

// Friendly, consistent "nothing here yet" placeholder with an optional call to
// action, so empty pages guide the user to the next step instead of dead-ending.
export default function EmptyState({
  icon = "notices",
  title,
  body,
  cta,
  emoji,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  cta?: { label: string; href: string };
  emoji?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gold-pale text-gold-deep">
        {emoji ? <span className="text-3xl">{emoji}</span> : <Icon name={icon} className="h-7 w-7" />}
      </span>
      <div>
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {body && <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-ink/50">{body}</p>}
      </div>
      {cta && (
        <Link href={cta.href} className="btn-gold mt-1 !rounded-full !px-6">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
