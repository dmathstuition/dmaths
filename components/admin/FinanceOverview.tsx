import Link from "next/link";
import { Icon, type IconName } from "@/components/Icons";

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

function Metric({ icon, label, value, sub, tint, alert }: {
  icon: IconName; label: string; value: string; sub?: string; tint: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${alert ? "border-red-200" : "border-line"}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <p className="mt-3 font-display text-2xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-ink/40">{label}</p>
      {sub && <p className={`mt-1 text-[12px] font-semibold ${alert ? "text-red-600" : "text-ink/45"}`}>{sub}</p>}
    </div>
  );
}

// Money-at-a-glance for the admin dashboard: what came in, what's recurring,
// and what's overdue — computed from the verified ledger + subscriptions.
export default function FinanceOverview({
  totalCollected, monthRevenue, mrr, activeSubs, overdueCount, overdueAmount,
}: {
  totalCollected: number; monthRevenue: number; mrr: number;
  activeSubs: number; overdueCount: number; overdueAmount: number;
}) {
  return (
    <div className="card neu-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon name="payments" className="text-gold-deep" />
          <h2 className="font-display text-lg font-semibold text-ink">Finance overview</h2>
        </div>
        <Link href="/admin/payments" className="text-sm font-bold text-gold-deep hover:underline">Payments →</Link>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon="payments" label="Received this month" value={naira(monthRevenue)} tint="bg-emerald-50 text-emerald-600" />
        <Metric icon="progress" label="Collected all-time" value={naira(totalCollected)} tint="bg-ink/10 text-ink" />
        <Metric icon="calendar" label="Monthly recurring" value={naira(mrr)}
          sub={`${activeSubs} active subscription${activeSubs === 1 ? "" : "s"}`} tint="bg-gold-pale text-gold-deep" />
        <Metric icon="alertTriangle" label="Overdue" value={overdueCount ? naira(overdueAmount) : "₦0"}
          sub={overdueCount ? `${overdueCount} subscriber${overdueCount === 1 ? "" : "s"} overdue` : "All up to date"}
          tint={overdueCount ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"} alert={overdueCount > 0} />
      </div>
    </div>
  );
}
