import React from "react";

// D-Maths social + web presence. Rendered in the public footers. Each icon is a
// circular chip that tints to the platform's brand colour on hover.
const IC = "h-[18px] w-[18px]";
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const SOCIALS: { label: string; href: string; hover: string; svg: React.ReactNode }[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=100075536673271",
    hover: "hover:bg-[#1877F2]",
    svg: <svg viewBox="0 0 24 24" className={IC} {...stroke}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/dmath_s101/",
    hover: "hover:bg-[#E4405F]",
    svg: <svg viewBox="0 0 24 24" className={IC} {...stroke}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@dmaths2",
    hover: "hover:bg-black",
    svg: <svg viewBox="0 0 24 24" className={IC} fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@DMaths-w6u",
    hover: "hover:bg-[#FF0000]",
    svg: <svg viewBox="0 0 24 24" className={IC} {...stroke}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" stroke="none" /></svg>,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/oladapobakare",
    hover: "hover:bg-[#0A66C2]",
    svg: <svg viewBox="0 0 24 24" className={IC} {...stroke}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
  },
  {
    label: "Portfolio",
    href: "https://standard-portfolio-woad.vercel.app",
    hover: "hover:bg-gold-deep",
    svg: <svg viewBox="0 0 24 24" className={IC} {...stroke}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  },
];

export default function SocialLinks({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const base = tone === "dark"
    ? "border-white/15 bg-white/5 text-white/60"
    : "border-line bg-white text-ink/50";
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {SOCIALS.map((s) => (
        <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:text-white hover:shadow-md ${base} ${s.hover}`}>
          {s.svg}
        </a>
      ))}
    </div>
  );
}
