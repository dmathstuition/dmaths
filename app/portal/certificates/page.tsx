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

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">🎓 My certificates</h1>
        <p className="mt-1 text-sm text-white/50">Your awards from D-Maths — open one to download or print it.</p>
      </div>

      {certs?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {certs.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link href={`/certificate/${c.id}`}
                className="card neu-card card-interactive flex h-full items-center gap-4 p-5">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                  <Icon name="trophy" className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-ink">{c.title}</p>
                  {c.subtitle && <p className="truncate text-sm text-ink/55">{c.subtitle}</p>}
                  <p className="mt-0.5 text-[11px] text-ink/40">
                    {new Date(c.issued_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {c.serial}
                  </p>
                </div>
                <span className="flex-shrink-0 text-gold-deep"><Icon name="download" /></span>
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
