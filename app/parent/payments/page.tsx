import Link from "next/link";
import { Icon } from "@/components/Icons";
import NoChildren from "@/components/parent/NoChildren";
import PaymentsSummary from "@/components/PaymentsSummary";
import PayBalanceButton from "@/components/PayBalanceButton";
import { getParentChildren, childName } from "@/lib/parentAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { owingSummary, fmtNaira } from "@/lib/payments";
import { fmtWATDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ParentPaymentsPage() {
  const ctx = await getParentChildren();
  if (!ctx) return null;
  if (!ctx.children.length) return <NoChildren />;

  const admin = supabaseAdmin();
  const childIds = ctx.children.map((c) => c.id);

  // The parent's own email, to bill a card payment to.
  const { data: parent } = await admin.from("profiles").select("email").eq("id", ctx.parentId).maybeSingle();
  const parentEmail = parent?.email ?? "";

  // Each child's monthly-fee fields, for the owing summary.
  const { data: subRows } = await admin
    .from("profiles").select("id, sub_active, sub_amount, sub_due_date").in("id", childIds);
  const subById = new Map((subRows ?? []).map((s: any) => [s.id, s]));

  // Match payments by the student link (reliable) OR by the child/guardian email
  // (covers older rows recorded before the link column existed).
  const emails = Array.from(new Set(
    ctx.children.flatMap((c) => [c.email, c.guardian_email]).filter(Boolean).map((e) => String(e).toLowerCase()),
  ));
  const filters = [
    childIds.length ? `student_id.in.(${childIds.join(",")})` : "",
    emails.length ? `email.in.(${emails.map((e) => `"${e}"`).join(",")})` : "",
  ].filter(Boolean).join(",");

  const { data: payments } = filters
    ? await admin.from("payments")
        .select("reference, amount, channel, status, paid_at, created_at, student_id, email")
        .or(filters).eq("status", "success")
        .order("paid_at", { ascending: false }).limit(200)
    : { data: [] as any[] };

  const rows = payments ?? [];
  const total = rows.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);

  const { data: receipts } = rows.length
    ? await admin.from("receipts").select("id, payment_reference").in("payment_reference", rows.map((p: any) => p.reference))
    : { data: [] as any[] };
  const receiptFor = new Map((receipts ?? []).map((r: any) => [r.payment_reference, r]));

  // Per-child owing: a payment counts for a child if it's linked to them, or its
  // email is that child's / their guardian's.
  const summaries = ctx.children.map((c) => {
    const childEmails = [c.email, c.guardian_email].filter(Boolean).map((e) => String(e).toLowerCase());
    const mine = rows.filter((p: any) =>
      p.student_id === c.id || (p.email && childEmails.includes(String(p.email).toLowerCase())));
    return { child: c, summary: owingSummary(subById.get(c.id) ?? {}, mine) };
  }).filter((s) => s.summary.hasPlan);

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="payments" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Payments</h1>
          <p className="mt-1 text-sm text-white/50">
            {rows.length ? `${rows.length} payment${rows.length === 1 ? "" : "s"} · ${fmtNaira(total)} total` : "No payments recorded yet."}
          </p>
        </div>
      </div>

      {summaries.map(({ child, summary }) => (
        <PaymentsSummary key={child.id} summary={summary}
          name={`${childName(child).split(" ")[0]}'s`}
          dueLabel={summary.dueDate ? fmtWATDate(summary.dueDate) : undefined}
          action={<PayBalanceButton email={parentEmail} amount={summary.owing} studentId={child.id} />} />
      ))}

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
            Payments made for your child will be listed here with their reference.
          </p>
        )}
      </div>

      {ctx.children.length > 0 && (
        <div className="card p-5">
          <p className="mb-3 font-display text-sm font-bold text-ink">Account statements</p>
          <div className="space-y-2">
            {ctx.children.map((c) => (
              <Link key={c.id} href={`/statement/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-2.5 text-sm transition hover:bg-chalk">
                <span className="font-semibold text-ink">{childName(c)}</span>
                <span className="flex items-center gap-1.5 font-bold text-gold-deep">
                  <Icon name="reports" className="h-4 w-4" /> Statement (PDF)
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="px-1 text-[12px] text-ink/45">
        Tap <strong>Receipt</strong> to open a printable copy. If a payment has no receipt yet,
        message us from the Messages tab with its reference and we&apos;ll issue one.
      </p>
    </div>
  );
}
