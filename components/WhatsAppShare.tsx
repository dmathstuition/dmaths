import { waLink } from "@/lib/whatsapp";

// Opens WhatsApp (app on mobile, WhatsApp Web on desktop) with the message
// pre-filled to `phone`. Renders nothing when the number is missing/invalid, so
// it's safe to drop in anywhere. A reliable fallback channel when email is down.
export default function WhatsAppShare({
  phone,
  text,
  label = "Share on WhatsApp",
  className,
}: {
  phone: string | null | undefined;
  text?: string;
  label?: string;
  className?: string;
}) {
  const href = waLink(phone, text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[.99]"
      }
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.13c-.24.68-1.42 1.31-1.96 1.36-.5.05-.98.24-3.32-.7-2.8-1.1-4.6-3.96-4.74-4.15-.14-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03.97-2.31.24-.26.53-.32.71-.32.18 0 .35 0 .5.01.16.01.38-.06.59.45.24.55.79 1.9.86 2.04.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.33.07.12.07.68-.17 1.36z" />
      </svg>
      {label}
    </a>
  );
}
