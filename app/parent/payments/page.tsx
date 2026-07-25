import { Icon } from "@/components/Icons";
import NoChildren from "@/components/parent/NoChildren";
import { getParentChildren } from "@/lib/parentAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export default async function ParentPaymentsPage() {
  const ctx = await getParentChildren();
  if (!ctx) return null;
  if (!ctx.children.length) return <NoChildren />;

  // The ledger is keyed by payer email — match the child's or the guardian's.
  const emails = Array.from(new Set(
    ctx.children.flatMap((c) => [c.email, c.guardian_email]).filter(Boolean).map((e) => String(e).toLowerCase()),
  ));

  const admin = supabaseAdmin();
  const { data: payments } = emails.length
    ? await admin.from("payments")
        .select("reference, amount, currency, channel, status, paid_at, created_at")
        .in("email", emails).eq("status", "success")
        .order("created_at", { ascending: false }).limit(100)
    : { data: [] as any[] };

  const rows = payments ?? [];
  const total = rows.reduce((a: number, p: any) => a + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="payments" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Payments</h1>
          <p className="mt-1 text-sm text-white/50">
            {rows.length ? `${rows.length} payment${rows.length === 1 ? "" : "s"} · ${naira(total)} total` : "No payments recorded yet."}
          </p>
        </div>
      </div>

      <div className="card neu-card overflow-hidden">
        {rows.length ? (
          <div className="divide-y divide-line/60">
            {rows.map((p: any) => (
              <div key={p.reference} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon name="checkCircle" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{naira(Number(p.amount || 0))}</p>
                  <p className="text-xs text-ink/50">
                    {new Date(p.paid_at || p.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    {p.channel ? ` · ${p.channel}` : ""}
                  </p>
                </div>
                <span className="flex-shrink-0 font-mono text-[11px] text-ink/40">{p.reference}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-ink/40">
            Payments made for your child will be listed here with their reference.
          </p>
        )}
      </div>

      <p className="px-1 text-[12px] text-ink/45">
        Need a formal receipt? Reply to your enrolment email or message us from the Messages tab with the reference above.
      </p>
    </div>
  );
}
