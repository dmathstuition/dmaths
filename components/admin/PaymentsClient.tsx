"use client";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { Icon } from "@/components/Icons";
import { findTier, fmtNgn } from "@/lib/summerCamp";

type Payment = Record<string, any>;

const MANUAL_METHODS = ["Access Bank Transfer", "Opay Bank Transfer", "Cash", "Other"];

type Receipt = { id: string; serial: string; payment_reference: string };

type Student = { id: string; first_name: string | null; last_name: string | null; email: string | null; student_code: string | null };

export default function PaymentsClient({ initial, subscribers = [], receipts = [], students = [] }: {
  initial: Payment[]; subscribers?: any[]; receipts?: Receipt[]; students?: Student[];
}) {
  const push = useToast();
  const [q, setQ] = useState("");
  // reference → receipt, so each row knows whether one has been issued.
  const [issued, setIssued] = useState<Record<string, Receipt>>(
    () => Object.fromEntries(receipts.map((r) => [r.payment_reference, r])),
  );
  const [issuing, setIssuing] = useState("");

  // Issue a numbered receipt for this payment. Idempotent server-side: asking
  // twice returns the receipt that already exists rather than a second number.
  async function issueReceipt(reference: string) {
    setIssuing(reference);
    const res = await fetch("/api/receipts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    setIssuing("");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not issue that receipt.", "error"); return; }
    setIssued((m) => ({ ...m, [reference]: { ...j.receipt, payment_reference: reference } }));
    push(j.alreadyIssued ? "That payment already has a receipt." : `Receipt ${j.receipt.serial} issued.`, "success");
  }

  // "Record manual payment" form — also reused, in edit mode, to correct one.
  const [showRecord, setShowRecord] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rec, setRec] = useState<any>({ method: MANUAL_METHODS[0] });
  const [recBusy, setRecBusy] = useState(false);
  const [recError, setRecError] = useState("");
  const [confirmDel, setConfirmDel] = useState<Payment | null>(null);

  // Only payments this form created may be corrected or removed. Paystack money
  // and application-approval rows stay locked.
  const isManual = (p: Payment) => p?.raw?.source === "manual-entry";

  function newRecord() {
    setEditing(false);
    setRec({ method: MANUAL_METHODS[0] });
    setRecError("");
    setShowRecord(v => !v);
  }

  function startEdit(p: Payment) {
    setEditing(true);
    setRecError("");
    setRec({
      reference: p.reference,
      email: p.email || "",
      amount: p.amount ?? "",
      method: String(p.channel || "").replace(/^Manual · /, "") || MANUAL_METHODS[0],
      paidAt: p.paid_at ? new Date(p.paid_at).toISOString().slice(0, 10) : "",
      note: p.raw?.note || "",
      studentId: p.student_id || "",
      _hasReceipt: !!issued[p.reference],
    });
    setShowRecord(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function recordPayment() {
    setRecError("");
    setRecBusy(true);
    const res = await fetch("/api/payments/manual", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: rec.studentId || "", email: rec.email, amount: Number(rec.amount), method: rec.method,
        reference: rec.reference || "", paidAt: rec.paidAt || "", note: rec.note || "",
      }),
    });
    setRecBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setRecError(j.error || (editing ? "Could not save the changes." : "Could not record the payment."));
      return;
    }
    window.location.reload(); // pick up the fresh ledger
  }

  async function deletePayment(p: Payment) {
    setConfirmDel(null);
    const res = await fetch(`/api/payments/manual?reference=${encodeURIComponent(p.reference)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not delete that payment.", "error"); return; }
    push("Payment deleted.", "success");
    window.location.reload();
  }

  const planName = (p: Payment) => findTier(p.plan)?.name ?? (p.plan || "—");

  const visible = initial.filter(
    (p) =>
      !q ||
      `${p.reference} ${p.email} ${p.plan} ${p.camp} ${planName(p)} ${p.channel}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  // Summary — count only genuinely successful charges toward money received.
  const success = initial.filter((p) => p.status === "success");
  const total = success.reduce((a, p) => a + Number(p.amount || 0), 0);
  const now = new Date();
  const monthTotal = success
    .filter((p) => {
      const d = new Date(p.paid_at || p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((a, p) => a + Number(p.amount || 0), 0);

  function exportCsv() {
    const header = "Date,Reference,Email,Package,Camp,Channel,Amount (NGN),Status";
    const rows = visible.map((p) =>
      [
        new Date(p.paid_at || p.created_at).toLocaleDateString("en-NG"),
        `"${(p.reference ?? "").replace(/"/g, '""')}"`,
        `"${(p.email ?? "").replace(/"/g, '""')}"`,
        `"${planName(p).replace(/"/g, '""')}"`,
        `"${(p.camp ?? "").replace(/"/g, '""')}"`,
        `"${(p.channel ?? "").replace(/"/g, '""')}"`,
        Number(p.amount || 0),
        p.status,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `dmaths-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Payments</h1>
          <p className="text-sm text-ink/45">
            Verified Paystack transactions recorded directly from Paystack — the trusted record of money received.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={newRecord} className="btn-gold !min-h-[40px] text-sm">
            {showRecord && !editing ? "Cancel" : "+ Record manual payment"}
          </button>
          {visible.length > 0 && (
            <button onClick={exportCsv} data-tour="payments-export" className="btn-ghost !min-h-[40px] text-sm">Export CSV</button>
          )}
        </div>
      </div>

      {/* Record a manual payment (bank transfer / Opay / cash / balance) */}
      {showRecord && (
        <div className="card neu-card space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">{editing ? "Edit manual payment" : "Record a manual payment"}</h2>
            <p className="text-sm text-ink/45">
              {editing
                ? "Correct a mistake in this entry. The reference stays the same; everything else can change."
                : "Bank transfer, Opay or cash — including part-payment balances. It lands in this ledger and counts in the revenue analytics."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="paymen-student" className="flabel">
                Learner <span className="font-normal text-ink/40">— links the payment to their portal &amp; their parent&apos;s</span>
              </label>
              <select id="paymen-student" className="field"
                value={rec.studentId || ""}
                onChange={e => {
                  const s = students.find(st => st.id === e.target.value);
                  setRec({ ...rec, studentId: e.target.value, email: s?.email || rec.email || "" });
                }}>
                <option value="">Not a specific learner (record by email only)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.email}{s.student_code ? ` · ${s.student_code}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paymen-payer-apos-s-email" className="flabel">Payer&apos;s email</label>
              <input id="paymen-payer-apos-s-email" className="field" type="email" placeholder="learner or parent email"
                value={rec.email || ""} onChange={e => setRec({ ...rec, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="paymen-amount" className="flabel">Amount (₦)</label>
              <input id="paymen-amount" className="field" type="number" min={1} placeholder="e.g. 25000"
                value={rec.amount || ""} onChange={e => setRec({ ...rec, amount: e.target.value })} />
            </div>
            <div>
              <label htmlFor="paymen-method" className="flabel">Method</label>
              <select id="paymen-method" className="field" value={rec.method} onChange={e => setRec({ ...rec, method: e.target.value })}>
                {MANUAL_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="paymen-payment-date-optional-to" className="flabel">Payment date <span className="font-normal text-ink/40">(optional — today if blank)</span></label>
              <input id="paymen-payment-date-optional-to" className="field" type="date" value={rec.paidAt || ""} onChange={e => setRec({ ...rec, paidAt: e.target.value })} />
            </div>
            <div>
              <label htmlFor="paymen-reference-optional-auto-" className="flabel">
                Reference <span className="font-normal text-ink/40">{editing ? "(fixed)" : "(optional — auto-generated if blank)"}</span>
              </label>
              <input id="paymen-reference-optional-auto-" className="field font-mono disabled:opacity-60" placeholder="e.g. bank narration"
                readOnly={editing} disabled={editing}
                value={rec.reference || ""} onChange={e => setRec({ ...rec, reference: e.target.value })} />
            </div>
            <div>
              <label htmlFor="paymen-note-optional" className="flabel">Note <span className="font-normal text-ink/40">(optional)</span></label>
              <input id="paymen-note-optional" className="field" placeholder="e.g. camp balance — second instalment"
                value={rec.note || ""} onChange={e => setRec({ ...rec, note: e.target.value })} />
            </div>
          </div>
          {editing && (
            <div className="rounded-xl bg-chalk px-4 py-3 text-[13px] text-ink/60">
              {rec._hasReceipt && (
                <p className="flex items-start gap-1.5 font-semibold text-amber-700">
                  <Icon name="alertTriangle" className="mt-0.5 h-4 w-4 flex-shrink-0" /> A receipt has already been issued for this payment — if you change the amount, re-issue the receipt so it matches.
                </p>
              )}
              <p className={rec._hasReceipt ? "mt-1" : ""}>
                Editing won&apos;t change the learner&apos;s next subscription due date. Adjust it on their profile if this correction affects it.
              </p>
            </div>
          )}
          {recError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{recError}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-gold" onClick={recordPayment} disabled={recBusy}>
              {recBusy
                ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : editing ? "Save changes" : "Record payment"}
            </button>
            {editing && (
              <button className="btn-ghost" onClick={() => { setShowRecord(false); setEditing(false); setRec({ method: MANUAL_METHODS[0] }); }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div data-tour="payments-summary" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total received" value={fmtNgn(total)} tint="emerald" />
        <SummaryCard label="This month" value={fmtNgn(monthTotal)} tint="gold" />
        <SummaryCard label="Successful payments" value={String(success.length)} tint="ink" />
      </div>

      {/* Monthly subscriptions — continuing learners after camp */}
      {subscribers.length > 0 && (
        <div className="card neu-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Monthly subscriptions</h2>
              <p className="text-sm text-ink/45">
                {subscribers.length} active · expected{" "}
                <strong className="text-ink/70">
                  {fmtNgn(subscribers.reduce((a, s) => a + Number(s.sub_amount || 0), 0))}
                </strong>{" "}
                / month
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {subscribers.map((s) => {
              const due = s.sub_due_date ? new Date(`${s.sub_due_date}T00:00:00+01:00`) : null;
              const days = due ? Math.ceil((due.getTime() - Date.now()) / 86_400_000) : null;
              const state = days === null ? { pill: "bg-ink/10 text-ink/50", label: "no due date" }
                : days < 0 ? { pill: "pill-red", label: `overdue ${Math.abs(days)}d` }
                : days <= 5 ? { pill: "pill-amber", label: `due in ${days}d` }
                : { pill: "pill-green", label: "paid up" };
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-chalk/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {s.first_name} {s.last_name}
                      <span className={`pill ml-2 ${state.pill}`}>{state.label}</span>
                    </p>
                    <p className="text-xs text-ink/45">
                      {s.email} · {fmtNgn(Number(s.sub_amount || 0))}/mo
                      {s.sub_due_date ? ` · next due ${new Date(`${s.sub_due_date}T00:00:00+01:00`).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" })}` : ""}
                    </p>
                  </div>
                  <button className="btn-ghost !min-h-[36px] !px-4 !text-sm"
                    onClick={() => {
                      setRec({ method: MANUAL_METHODS[0], email: s.email, amount: s.sub_amount || "", note: "Monthly subscription" });
                      setShowRecord(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>
                    Record payment
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-ink/40">
            Recording a payment for a subscriber's email automatically moves their due date forward one month.
          </p>
        </div>
      )}

      <input
        data-tour="payments-search"
        className="field max-w-sm"
        placeholder="Search reference, email, package…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {initial.length === 0 ? (
        <div className="card p-12 text-center text-ink/45">
          <p className="font-semibold text-ink/60">No payments recorded yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm">
            Approved manual payments land here automatically, or use <strong>+ Record manual
            payment</strong> above for transfers/cash. Once Paystack is live, every verified
            card payment appears here too.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="card hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-chalk text-left text-[11px] uppercase tracking-wider text-ink/40">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Package</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id ?? p.reference} className="border-t border-line/60 transition hover:bg-chalk/50">
                    <td className="px-5 py-3 whitespace-nowrap text-ink/60">
                      {new Date(p.paid_at || p.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-ink/50">{p.reference}</td>
                    <td className="px-5 py-3 text-ink/70">{p.email || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-ink/75">{planName(p)}</span>
                      {p.camp && <span className="ml-2 pill-amber inline-flex items-center gap-1"><Icon name="sun" className="h-3 w-3" /> {p.camp}</span>}
                    </td>
                    <td className="px-5 py-3 capitalize text-ink/60">{p.channel || "—"}</td>
                    <td className="px-5 py-3 text-right font-extrabold text-ink">{fmtNgn(Number(p.amount || 0))}</td>
                    <td className="px-5 py-3">
                      <span className={p.status === "success" ? "pill-green" : "pill-amber"}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <ReceiptCell payment={p} receipt={issued[p.reference]}
                        busy={issuing === p.reference} onIssue={() => issueReceipt(p.reference)} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      {isManual(p) && (
                        <span className="inline-flex gap-1">
                          <button onClick={() => startEdit(p)} aria-label="Edit this payment"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-ink/55 transition hover:bg-chalk hover:text-ink">Edit</button>
                          <button onClick={() => setConfirmDel(p)} aria-label="Delete this payment"
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-ink/40">No payments match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 lg:hidden">
            {visible.map((p) => (
              <div key={p.id ?? p.reference} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink/80">{planName(p)}</p>
                    <p className="truncate text-xs text-ink/50">{p.email || "—"}</p>
                  </div>
                  <span className="flex-shrink-0 font-display text-lg font-extrabold text-ink">{fmtNgn(Number(p.amount || 0))}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs text-ink/50">
                  <span className={p.status === "success" ? "pill-green" : "pill-amber"}>{p.status}</span>
                  {p.camp && <span className="pill-amber inline-flex items-center gap-1"><Icon name="sun" className="h-3 w-3" /> {p.camp}</span>}
                  {p.channel && <span className="capitalize">{p.channel}</span>}
                  <span className="ml-auto">{new Date(p.paid_at || p.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
                </div>
                <p className="mt-2 truncate font-mono text-[11px] text-ink/35">{p.reference}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ReceiptCell payment={p} receipt={issued[p.reference]}
                    busy={issuing === p.reference} onIssue={() => issueReceipt(p.reference)} />
                  {isManual(p) && (
                    <span className="ml-auto inline-flex gap-1">
                      <button onClick={() => startEdit(p)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink/60">Edit</button>
                      <button onClick={() => setConfirmDel(p)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-red-600">Delete</button>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!visible.length && <div className="card p-10 text-center text-ink/40">No payments match your search.</div>}
          </div>
        </>
      )}

      {confirmDel && (
        <ConfirmModal
          title="Delete this payment?"
          message={
            `${fmtNgn(Number(confirmDel.amount || 0))} from ${confirmDel.email || "—"} will be removed from the ledger.` +
            (issued[confirmDel.reference] ? ` Its receipt (${issued[confirmDel.reference].serial}) will be removed too.` : "") +
            " This won't change the learner's subscription due date."
          }
          confirmLabel="Delete payment" danger
          onConfirm={() => deletePayment(confirmDel)}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}

const TINTS: Record<string, string> = {
  emerald: "text-emerald-600",
  gold: "text-gold-deep",
  ink: "text-ink",
};

function SummaryCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="card p-5">
      <p className={`font-display text-2xl font-extrabold ${TINTS[tint]}`}>{value}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
    </div>
  );
}


// One payment's receipt state: a link once issued, a button when it can be, and
// nothing at all for a payment that never succeeded.
function ReceiptCell({ payment, receipt, busy, onIssue }: {
  payment: Payment; receipt?: Receipt; busy: boolean; onIssue: () => void;
}) {
  if (receipt) {
    return (
      <Link href={`/receipt/${receipt.id}`} className="text-xs font-bold text-gold-deep hover:underline">
        {receipt.serial} →
      </Link>
    );
  }
  if (payment.status !== "success") return <span className="text-xs text-ink/35">—</span>;
  return (
    <button onClick={onIssue} disabled={busy}
      className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink/60 transition hover:border-gold/50 hover:text-ink disabled:opacity-50">
      {busy ? "Issuing…" : "Issue receipt"}
    </button>
  );
}
