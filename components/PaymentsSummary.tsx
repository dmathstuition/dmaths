import { Icon } from "@/components/Icons";
import { fmtNaira, type OwingSummary } from "@/lib/payments";

// The "this month" fee card, shared by the student and parent payment pages.
// Reads a computed OwingSummary (lib/payments) so the arithmetic lives in one
// tested place. Says nothing at all when the learner is on no monthly plan.
export default function PaymentsSummary({ summary, name, dueLabel, action }: {
  summary: OwingSummary;
  name?: string;         // "Ada's" — omitted on the student's own page
  dueLabel?: string;     // pre-formatted due date, e.g. "5 Aug 2026"
  action?: React.ReactNode;  // a "Pay now" button, shown only when there's a balance
}) {
  if (!summary.hasPlan) return null;

  const tone =
    summary.state === "paid" ? { ring: "border-emerald-300", bg: "bg-emerald-50", ink: "text-emerald-700", icon: "checkCircle" as const }
    : summary.state === "overdue" ? { ring: "border-red-300", bg: "bg-red-50", ink: "text-red-700", icon: "alertTriangle" as const }
    : { ring: "border-gold/40", bg: "bg-gold-pale", ink: "text-gold-deep", icon: "payments" as const };

  const owner = name ? `${name} ` : "";

  return (
    <div className={`card border ${tone.ring} p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.ink}`}>
          <Icon name={tone.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-ink">
            {summary.state === "paid"
              ? `${owner}fees are up to date this month 🎉`
              : summary.state === "overdue"
                ? `${owner}payment is overdue`
                : `${owner}fees for this month`}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <Cell label="This month's fee" value={fmtNaira(summary.monthlyFee)} />
            <Cell label="Paid this month" value={fmtNaira(summary.paidThisMonth)} />
            <Cell label="Still owing" value={fmtNaira(summary.owing)}
              strong valueClass={summary.owing > 0 ? tone.ink : "text-emerald-700"} />
          </dl>

          {dueLabel && (
            <p className={`mt-3 text-[13px] font-semibold ${summary.overdue ? "text-red-600" : "text-ink/55"}`}>
              {summary.overdue ? "Was due" : "Due"} {dueLabel}
            </p>
          )}

          {summary.owing > 0 && action}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, strong, valueClass }: {
  label: string; value: string; strong?: boolean; valueClass?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className={`font-display ${strong ? "text-xl font-extrabold" : "text-lg font-bold"} ${valueClass ?? "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
