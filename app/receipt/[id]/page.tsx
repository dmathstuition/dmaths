import { redirect, notFound } from "next/navigation";
import Logo from "@/components/Logo";
import CertificateActions from "@/components/CertificateActions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser, getProfile } from "@/lib/auth";
import { fmtNgn } from "@/lib/summerCamp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt — D-Maths", robots: { index: false } };

// A printable proof of payment. Readable by the learner it belongs to, a linked
// parent, whoever's email actually paid, and staff — checked here explicitly
// rather than trusted, because this page runs as the service role.
export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getProfile();

  const admin = supabaseAdmin();
  const { data: receipt } = await admin
    .from("receipts")
    .select("id, serial, payment_reference, student_id, payer_email, amount, paid_at, note, issued_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!receipt) notFound();

  const isStaff = me?.role === "admin" || me?.role === "tutor";
  let allowed = isStaff || receipt.student_id === user.id;

  if (!allowed && me?.role === "parent" && receipt.student_id) {
    const { data: link } = await admin.from("parent_student_links")
      .select("student_id").eq("parent_id", user.id).eq("student_id", receipt.student_id).maybeSingle();
    allowed = !!link;
  }
  // The person whose money it was can always see it.
  if (!allowed && receipt.payer_email && user.email) {
    allowed = receipt.payer_email.toLowerCase() === user.email.toLowerCase();
  }
  if (!allowed) notFound();

  const { data: student } = receipt.student_id
    ? await admin.from("profiles").select("first_name, last_name, student_code, level").eq("id", receipt.student_id).maybeSingle()
    : { data: null };

  const name = `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim();
  const backHref = isStaff ? "/admin/payments" : me?.role === "parent" ? "/parent/payments" : "/portal";
  const date = (v: string | null) => v
    ? new Date(v).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <div className="doc-light min-h-screen bg-chalk py-8 print:bg-white print:py-0">
      <div className="cert-sheet mx-auto max-w-3xl bg-white px-6 py-8 shadow-2xl sm:px-12 sm:py-10 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b-2 border-board pb-5">
          <Logo size="lg" />
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-board sm:text-3xl">Payment Receipt</h1>
            <p className="text-sm font-semibold text-gold-deep">{receipt.serial}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Received from" value={receipt.payer_email || "—"} />
          <Field label="Date of payment" value={date(receipt.paid_at)} />
          {name && <Field label="For the account of" value={name} />}
          {student?.student_code && <Field label="Student ID" value={student.student_code} />}
          {student?.level && <Field label="Class / Level" value={student.level} />}
          <Field label="Reference" value={receipt.payment_reference} />
        </div>

        <div className="mt-6 rounded-2xl border-2 border-gold-deep bg-gold-pale px-6 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/50">Amount received</p>
          <p className="font-display text-4xl font-extrabold text-board">{fmtNgn(Number(receipt.amount ?? 0))}</p>
          {receipt.note && <p className="mt-1 text-sm font-semibold text-ink/60">{receipt.note}</p>}
        </div>

        <div className="mt-6 rounded-xl bg-chalk px-5 py-4 text-sm text-ink/60">
          <p>
            This receipt confirms payment received by <strong>D-Maths Tuition</strong>
            {name ? <> for <strong>{name}</strong></> : null}. Please keep it for your records.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-display text-base font-bold text-board">D-Maths Tuition</p>
            <p className="text-[12px] text-ink/50">dmathstuition@gmail.com</p>
          </div>
          <p className="text-[11px] text-ink/45">Issued {date(receipt.issued_at)}</p>
        </div>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-ink/35">
          Receipt No. {receipt.serial}
        </p>
      </div>

      <CertificateActions backHref={backHref} />

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .no-print { display: none !important; }
          .cert-sheet { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
      <p className="break-words font-display text-base font-bold text-ink">{value}</p>
    </div>
  );
}
