import Link from "next/link";
import Reveal from "@/components/landing/Reveal";
import { Icon } from "@/components/Icons";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const supa = supabaseServer();
  // RLS returns only this learner's certificates. Errors harmlessly to null
  // before the migration is run.
  const { data: certs } = await supa
    .from("certificates")
    .select("id, title, subtitle, issued_at, serial")
    .order("issued_at", { ascending: false });

  const count = certs?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="trophy" className="h-6 w-6" /></div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name="sparkles" className="h-5 w-5" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="graduationCap" className="h-6 w-6" />
        </span>
        <div className="relative">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Achievement wall</h1>
          <p className="mt-1 text-sm text-white/50">
            {count > 0 ? <><span className="font-bold text-gold">{count}</span> award{count !== 1 ? "s" : ""} earned · tap one to download or print it.</> : "Your awards from D-Maths will appear here."}
          </p>
        </div>
      </div>

      {certs?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link href={`/certificate/${c.id}`}
                className="sheen group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-lift ring-1 ring-gold/25 transition-all duration-300 hover:-translate-y-1 hover:ring-gold/50 dark:bg-[#0f2942]">
                {/* gold ribbon accent down the left edge */}
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#F4C078] via-[#EFAE56] to-[#C8881F]" />
                <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F4C078] to-[#C8881F] text-board shadow-[0_8px_24px_-8px_rgba(239,174,86,.9)] transition-transform duration-300 group-hover:scale-110">
                  <Icon name="trophy" className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-ink dark:text-white">{c.title}</p>
                  {c.subtitle && <p className="truncate text-sm text-ink/55 dark:text-white/55">{c.subtitle}</p>}
                  <p className="mt-0.5 text-[11px] text-ink/40 dark:text-white/40">
                    {new Date(c.issued_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {c.serial}
                  </p>
                </div>
                <span className="relative flex-shrink-0 text-gold-deep transition-transform group-hover:translate-y-0.5"><Icon name="download" /></span>
              </Link>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center gap-2 py-14 text-ink/40">
          <Icon name="trophy" className="h-8 w-8" />
          <p className="text-sm">No certificates yet — keep learning and they&apos;ll appear here.</p>
        </div>
      )}
    </div>
  );
}
