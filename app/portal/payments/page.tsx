import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icons";
import PaymentsSummary from "@/components/PaymentsSummary";
import PayBalanceButton from "@/components/PayBalanceButton";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { owingSummary, fmtNaira } from "@/lib/payments";
import { fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "My payments · D-Maths" };

export default async function PortalPaymentsPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supa
    .from("profiles").select("email, sub_active, sub_amount, sub_due_date").eq("id", user.id).single();

  // A learner's own payments: those linked to them, plus any older rows recorded
  // against their email before the link column existed. Read with the service
  // role and an explicit own-id/own-email filter so this works whether or not
  // the RLS policy from migration-payment-links.sql has been applied yet.
  const admin = supabaseAdmin();
  const email = (me?.email ?? "").toLowerCase();
  const { data: payments } = await admin
    .from("payments")
    .select("reference, amount, channel, status, paid_at, created_at, student_id, email")
    .or(`student_id.eq.${user.id}${email ? `,email.eq."${email}"` : ""}`)
    .eq("status", "success")
    .order("paid_at", { ascending: false })
    .limit(200);

  const rows = payments ?? [];
  const summary = owingSummary(me ?? {}, rows);
  const total = rows.reduce((a, p: any) => a + Number(p.amount || 0), 0);

  // Receipts issued for these payments (empty before migration-receipts.sql).
  const { data: receipts } = rows.length
    ? await admin.from("receipts").select("id, payment_reference").in("payment_reference", rows.map((p: any) => p.reference))
    : { data: [] as any[] };
  const receiptFor = new Map((receipts ?? []).map((r: any) => [r.payment_reference, r]));

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="payments" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">My payments</h1>
          <p className="mt-1 text-sm text-white/50">
            {rows.length ? `${rows.length} payment${rows.length === 1 ? "" : "s"} · ${fmtNaira(total)} in total` : "Your payment records will appear here."}
          </p>
        </div>
      </div>

      <PaymentsSummary summary={summary} dueLabel={summary.dueDate ? fmtWATDate(summary.dueDate) : undefined}
        action={<PayBalanceButton email={me?.email ?? ""} amount={summary.owing} studentId={user.id} />} />

      {summary.hasPlan && (
        <Link href={`/invoice/${user.id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-gold-deep transition hover:bg-chalk">
          <Icon name="reports" className="h-4 w-4" /> View this month&apos;s invoice
        </Link>
      )}

      <div className="card neu-card overflow-hidden">
        {rows.length ? (
          <div className="divide-y divide-line/60">
            {rows.map((p: any) => (
              <div key={p.reference} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon name="checkCircle" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{fmtNaira(Number(p.amount || 0))}</p>
                  <p className="text-xs text-ink/50">
                    {fmtWATDate(p.paid_at || p.created_at)}{p.channel ? ` · ${p.channel}` : ""}
                  </p>
                </div>
                {receiptFor.has(p.reference) ? (
                  <Link href={`/receipt/${receiptFor.get(p.reference).id}`}
                    className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-gold-deep transition hover:bg-chalk">
                    Receipt →
                  </Link>
                ) : (
                  <span className="flex-shrink-0 font-mono text-[11px] text-ink/40">{p.reference}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-ink/40">
            No payments recorded yet. Once the school records one, it will show here.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <Link href={`/statement/${user.id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold text-gold-deep transition hover:bg-chalk">
          <Icon name="reports" className="h-4 w-4" /> Download account statement (PDF)
        </Link>
      )}

      <p className="px-1 text-[12px] text-ink/45">
        Something look wrong? Message your tutor from the Messages tab with the reference and we&apos;ll check it.
      </p>
    </div>
  );
}
