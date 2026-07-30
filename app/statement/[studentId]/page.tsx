import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Logo from "@/components/Logo";
import CertificateActions from "@/components/CertificateActions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser, getProfile } from "@/lib/auth";
import { fmtNaira } from "@/lib/payments";
import { availableYears, buildStatement } from "@/lib/statement";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account statement — D-Maths", robots: { index: false } };

// A printable payment statement for a learner over a period. Readable by the
// learner, a linked parent, or staff — authorised here explicitly because the
// page reads with the service role. "Save as PDF" from the browser print dialog.
export default async function StatementPage({
  params, searchParams,
}: {
  params: { studentId: string };
  searchParams: { year?: string };
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getProfile();
  const admin = supabaseAdmin();

  const { data: student } = await admin
    .from("profiles").select("id, first_name, last_name, student_code, level, email, role")
    .eq("id", params.studentId).maybeSingle();
  if (!student || student.role !== "student") notFound();

  // Authorise: the learner themselves, staff, or a linked parent.
  const isStaff = me?.role === "admin" || me?.role === "tutor";
  let allowed = isStaff || student.id === user.id;
  if (!allowed && me?.role === "parent") {
    const { data: link } = await admin.from("parent_student_links")
      .select("student_id").eq("parent_id", user.id).eq("student_id", student.id).maybeSingle();
    allowed = !!link;
  }
  if (!allowed) notFound();

  const email = (student.email ?? "").toLowerCase();
  const { data: payments } = await admin
    .from("payments")
    .select("reference, amount, channel, paid_at, created_at, student_id, email")
    .or(`student_id.eq.${student.id}${email ? `,email.eq."${email}"` : ""}`)
    .eq("status", "success")
    .limit(500);
  const rows = payments ?? [];

  const years = availableYears(rows);
  const requested = Number(searchParams.year);
  const allTime = searchParams.year === "all";
  const year = allTime ? null : (years.includes(requested) ? requested : (years[0] ?? new Date().getUTCFullYear()));

  const { lines, total } = buildStatement(rows, year);
  const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student";
  const backHref = isStaff ? "/admin/payments" : me?.role === "parent" ? "/parent/payments" : "/portal/payments";
  const periodLabel = allTime ? "All time" : String(year);
  const fmtDate = (v: string) => new Date(v).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="doc-light min-h-screen bg-chalk py-8 print:bg-white print:py-0">
      {/* Period selector — hidden when printing. */}
      {(years.length > 0) && (
        <div className="no-print mx-auto mb-4 flex max-w-3xl flex-wrap items-center gap-2 px-4">
          <span className="text-sm font-semibold text-ink/50">Period:</span>
          {years.map((y) => (
            <Link key={y} href={`/statement/${student.id}?year=${y}`}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${year === y ? "bg-ink text-white" : "border border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              {y}
            </Link>
          ))}
          <Link href={`/statement/${student.id}?year=all`}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${allTime ? "bg-ink text-white" : "border border-line bg-white text-ink/60 hover:bg-chalk"}`}>
            All time
          </Link>
        </div>
      )}

      <div className="cert-sheet mx-auto max-w-3xl bg-white px-6 py-8 shadow-2xl sm:px-12 sm:py-10 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b-2 border-board pb-5">
          <Logo size="lg" />
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-board sm:text-3xl">Account Statement</h1>
            <p className="text-sm font-semibold text-gold-deep">{periodLabel}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Learner" value={name} />
          {student.student_code && <Field label="Student ID" value={student.student_code} />}
          {student.level && <Field label="Class / Level" value={student.level} />}
          <Field label="Statement generated" value={fmtDate(new Date().toISOString())} />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b-2 border-ink/15 text-left text-[11px] uppercase tracking-wide text-ink/45">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Reference</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.reference} className="border-b border-line/70">
                  <td className="py-2.5 pr-3 whitespace-nowrap text-ink/70">{fmtDate(l.date)}</td>
                  <td className="py-2.5 pr-3 text-ink/70">{l.description}</td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-ink/45">{l.reference}</td>
                  <td className="py-2.5 text-right font-bold text-ink">{fmtNaira(l.amount)}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-ink/40">No payments in this period.</td></tr>
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-ink/15">
                  <td colSpan={3} className="py-3 pr-3 font-display text-base font-bold text-ink">Total received</td>
                  <td className="py-3 text-right font-display text-lg font-extrabold text-board">{fmtNaira(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-6 rounded-xl bg-chalk px-5 py-4 text-sm text-ink/60">
          <p>
            This statement lists payments received by <strong>D-Maths Tuition</strong> for <strong>{name}</strong>
            {allTime ? "" : <> during <strong>{periodLabel}</strong></>}. Keep it for your records.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-display text-base font-bold text-board">D-Maths Tuition</p>
            <p className="text-[12px] text-ink/50">support@dmaths.academy</p>
          </div>
          <p className="text-[11px] text-ink/45">{lines.length} payment{lines.length === 1 ? "" : "s"} · {periodLabel}</p>
        </div>
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
