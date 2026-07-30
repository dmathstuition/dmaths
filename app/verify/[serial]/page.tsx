import Link from "next/link";
import Logo from "@/components/Logo";
import { Icon } from "@/components/Icons";
import VerifyForm from "@/components/VerifyForm";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { lookupCredential } from "@/lib/verify";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verification result — D-Maths", robots: { index: false } };

export default async function VerifyResult({ params }: { params: { serial: string } }) {
  const serial = decodeURIComponent(params.serial);
  const credential = await lookupCredential(supabaseAdmin(), serial).catch(() => null);
  const issued = credential
    ? new Date(credential.issuedAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <main className="boardgrid flex min-h-screen flex-col items-center justify-center bg-board p-6 text-center text-white">
      <Link href="/"><Logo light size="lg" /></Link>

      {credential ? (
        <div className="mt-8 w-full max-w-md rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
            <Icon name="checkCircle" className="h-9 w-9" />
          </span>
          <p className="mt-4 font-display text-2xl font-bold text-emerald-300">Genuine ✓</p>
          <p className="mt-1 text-sm text-white/55">
            This is a valid D-Maths {credential.kind === "certificate" ? "certificate" : "report card"}.
          </p>

          <dl className="mt-6 space-y-3 text-left">
            <Row label="Issued to" value={credential.name} />
            <Row label="Document" value={credential.subtitle ? `${credential.title} — ${credential.subtitle}` : credential.title} />
            <Row label="Issued on" value={issued!} />
            <Row label="Reference" value={credential.serial} mono />
          </dl>
        </div>
      ) : (
        <div className="mt-8 w-full max-w-md rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-300">
            <Icon name="alertTriangle" className="h-9 w-9" />
          </span>
          <p className="mt-4 font-display text-2xl font-bold text-red-300">Not found</p>
          <p className="mt-2 text-sm text-white/55">
            No D-Maths document matches the code <span className="font-mono text-white/80">{serial}</span>.
            Check for typos (letters and numbers are easy to mix up), or try again below.
          </p>
          <div className="mt-6 flex justify-center">
            <VerifyForm defaultValue={serial} />
          </div>
        </div>
      )}

      <Link href="/verify" className="mt-10 text-sm font-semibold text-white/50 hover:text-white">Verify another document</Link>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-white/40">{label}</dt>
      <dd className={`text-right text-sm font-semibold text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
