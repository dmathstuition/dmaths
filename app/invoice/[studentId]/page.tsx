import { redirect, notFound } from "next/navigation";
import Logo from "@/components/Logo";
import CertificateActions from "@/components/CertificateActions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser, getProfile } from "@/lib/auth";
import { owingSummary, fmtNaira, monthLabel, invoiceNumber } from "@/lib/payments";
import { fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice — D-Maths", robots: { index: false } };

// A printable invoice for the learner's CURRENT-MONTH tuition fee. Where the
// statement lists money already received, this is the forward-looking bill:
// what's due this month, what's been paid, and the outstanding balance.
// Readable by the learner, a linked parent, or staff — authorised explicitly
// because the page reads with the service role. "Save as PDF" from print.
export default async function InvoicePage({ params }: { params: { studentId: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getProfile();
  const admin = supabaseAdmin();

  const { data: student } = await admin
    .from("profiles").select("id, first_name, last_name, student_code, level, email, role, sub_active, sub_amount, sub_due_date")
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
    .select("amount, status, paid_at, created_at, student_id, email")
    .or(`student_id.eq.${student.id}${email ? `,email.eq."${email}"` : ""}`)
    .eq("status", "success")
    .limit(500);

  const summary = owingSummary(student, payments ?? []);
  if (!summary.hasPlan) {
    // No monthly plan means there's nothing to invoice.
    return (
      <div className="doc-light flex min-h-screen items-center justify-center bg-chalk p-6 text-center">
        <div className="card max-w-md p-8">
          <h1 className="font-display text-xl font-bold text-ink">No active plan</h1>
          <p className="mt-2 text-sm text-ink/55">There&apos;s no monthly subscription set up, so there&apos;s nothing to invoice right now.</p>
          <a href="/portal/payments" className="btn-ghost mt-6 !rounded-xl">Back to payments</a>
        </div>
      </div>
    );
  }

  const name = `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student";
  const now = new Date();
  const period = monthLabel(now);
  const invNo = invoiceNumber(student.student_code, now);
  const backHref = isStaff ? "/admin/payments" : me?.role === "parent" ? "/parent/payments" : "/portal/payments";

  const statusChip = summary.state === "paid"
    ? { text: "Paid", cls: "bg-emerald-100 text-emerald-700" }
    : summary.state === "overdue"
      ? { text: "Overdue", cls: "bg-red-100 text-red-700" }
      : { text: "Due", cls: "bg-amber-100 text-amber-700" };

  return (
    <div className="doc-light min-h-screen bg-chalk py-8 print:bg-white print:py-0">
      <div className="cert-sheet mx-auto max-w-3xl bg-white px-6 py-8 shadow-2xl sm:px-12 sm:py-10 print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b-2 border-board pb-5">
          <Logo size="lg" />
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-board sm:text-3xl">Invoice</h1>
            <p className="text-sm font-semibold text-gold-deep">{period}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Billed to" value={name} />
          {student.student_code && <Field label="Student ID" value={student.student_code} />}
          <Field label="Invoice no." value={invNo} />
          <Field label="Issued" value={fmtWATDate(now.toISOString())} />
          {summary.dueDate && <Field label="Due date" value={fmtWATDate(summary.dueDate)} />}
          {student.level && <Field label="Class / Level" value={student.level} />}
        </div>

        <div className="mt-4">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold ${statusChip.cls}`}>{statusChip.text}</span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b-2 border-ink/15 text-left text-[11px] uppercase tracking-wide text-ink/45">
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line/70">
                <td className="py-2.5 pr-3 text-ink/70">Monthly tuition — {period}</td>
                <td className="py-2.5 text-right font-bold text-ink">{fmtNaira(summary.monthlyFee)}</td>
              </tr>
              {summary.paidThisMonth > 0 && (
                <tr className="border-b border-line/70">
                  <td className="py-2.5 pr-3 text-emerald-700">Paid this month</td>
                  <td className="py-2.5 text-right font-bold text-emerald-700">− {fmtNaira(summary.paidThisMonth)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/15">
                <td className="py-3 pr-3 font-display text-base font-bold text-ink">Balance due</td>
                <td className="py-3 text-right font-display text-lg font-extrabold text-board">{fmtNaira(summary.owing)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 rounded-xl bg-chalk px-5 py-4 text-sm text-ink/60">
          {summary.owing > 0 ? (
            <p>Please settle the balance of <strong>{fmtNaira(summary.owing)}</strong>{summary.dueDate ? <> by <strong>{fmtWATDate(summary.dueDate)}</strong></> : ""} to keep <strong>{name}</strong>&apos;s learning uninterrupted. You can pay from the portal&apos;s Payments page.</p>
          ) : (
            <p>This month&apos;s tuition for <strong>{name}</strong> is fully paid — thank you. Keep this invoice for your records.</p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="font-display text-base font-bold text-board">D-Maths Tuition</p>
            <p className="text-[12px] text-ink/50">support@dmaths.academy</p>
          </div>
          <p className="text-[11px] text-ink/45">{invNo}</p>
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
