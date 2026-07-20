import { redirect, notFound } from "next/navigation";
import Logo from "@/components/Logo";
import CertificateActions from "@/components/CertificateActions";
import { supabaseServer } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificate — D-Maths", robots: { index: false } };

export default async function CertificatePage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");

  const supa = supabaseServer();
  // RLS lets the owner (or an admin) read this row; anyone else gets nothing.
  const { data: cert } = await supa
    .from("certificates")
    .select("id, student_id, title, subtitle, note, serial, issued_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!cert) notFound();

  const { data: student } = await supa
    .from("profiles").select("first_name, last_name").eq("id", cert.student_id).maybeSingle();
  const name = `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || "Student";

  const me = await getProfile();
  const backHref = me?.role === "admin" ? "/admin/certificates" : "/portal/certificates";
  const issued = new Date(cert.issued_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-chalk py-8 print:bg-white print:py-0">
      {/* The certificate — A4 landscape when printed */}
      <div className="cert-sheet mx-auto max-w-3xl bg-[#FDF9F0] px-6 py-8 shadow-2xl sm:px-12 sm:py-12 print:max-w-none print:shadow-none">
        <div className="relative border-[3px] border-gold-deep p-6 sm:p-10"
          style={{ outline: "1px solid #C8881F", outlineOffset: "6px" }}>
          {/* corner flourishes */}
          <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-gold-deep" />
          <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-gold-deep" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-gold-deep" />
          <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-gold-deep" />

          <div className="flex flex-col items-center text-center">
            <Logo size="lg" />
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[.35em] text-gold-deep">D-Maths Tuition Centre</p>
            <h1 className="mt-3 font-display text-3xl font-bold text-board sm:text-4xl">{cert.title}</h1>
            {cert.subtitle && <p className="mt-1 font-display text-lg font-semibold text-gold-deep">{cert.subtitle}</p>}

            <p className="mt-8 text-sm text-ink/55">This is proudly presented to</p>
            <p className="mt-2 border-b-2 border-gold/40 px-8 pb-1 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              {name}
            </p>

            {cert.note && <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink/65">{cert.note}</p>}

            <div className="mt-10 flex w-full items-end justify-between gap-6 text-left">
              <div>
                <p className="font-display text-lg font-bold text-ink">{issued}</p>
                <div className="mt-1 w-40 border-t border-ink/30" />
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Date issued</p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-board">D-Maths</p>
                <div className="mt-1 ml-auto w-40 border-t border-ink/30" />
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Authorised signature</p>
              </div>
            </div>

            <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink/35">Certificate No. {cert.serial}</p>
          </div>
        </div>
      </div>

      <CertificateActions backHref={backHref} />

      {/* print rules: landscape sheet, hide everything but the certificate */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .no-print { display: none !important; }
          .cert-sheet { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
