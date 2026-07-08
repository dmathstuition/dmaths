"use client";
import { useState } from "react";
import { findTier, fmtNgn } from "@/lib/summerCamp";

type Payment = Record<string, any>;

const MANUAL_METHODS = ["Access Bank Transfer", "Opay Bank Transfer", "Cash", "Other"];

export default function PaymentsClient({ initial }: { initial: Payment[] }) {
  const [q, setQ] = useState("");
  // "Record manual payment" form (bank transfer / cash / balance payments)
  const [showRecord, setShowRecord] = useState(false);
  const [rec, setRec] = useState<any>({ method: MANUAL_METHODS[0] });
  const [recBusy, setRecBusy] = useState(false);
  const [recError, setRecError] = useState("");

  async function recordPayment() {
    setRecError("");
    setRecBusy(true);
    const res = await fetch("/api/payments/manual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: rec.email, amount: Number(rec.amount), method: rec.method,
        reference: rec.reference || "", paidAt: rec.paidAt || "", note: rec.note || "",
      }),
    });
    setRecBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setRecError(j.error || "Could not record the payment.");
      return;
    }
    window.location.reload(); // pick up the fresh ledger row
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
          <button onClick={() => setShowRecord(v => !v)} className="btn-gold !min-h-[40px] text-sm">
            {showRecord ? "Cancel" : "+ Record manual payment"}
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
            <h2 className="font-display text-lg font-semibold">Record a manual payment</h2>
            <p className="text-sm text-ink/45">
              Bank transfer, Opay or cash — including part-payment balances. It lands in this
              ledger and counts in the revenue analytics.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flabel">Payer&apos;s email</label>
              <input className="field" type="email" placeholder="learner or parent email"
                value={rec.email || ""} onChange={e => setRec({ ...rec, email: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Amount (₦)</label>
              <input className="field" type="number" min={1} placeholder="e.g. 25000"
                value={rec.amount || ""} onChange={e => setRec({ ...rec, amount: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Method</label>
              <select className="field" value={rec.method} onChange={e => setRec({ ...rec, method: e.target.value })}>
                {MANUAL_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">Payment date <span className="font-normal text-ink/40">(optional — today if blank)</span></label>
              <input className="field" type="date" value={rec.paidAt || ""} onChange={e => setRec({ ...rec, paidAt: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Reference <span className="font-normal text-ink/40">(optional — auto-generated if blank)</span></label>
              <input className="field font-mono" placeholder="e.g. bank narration"
                value={rec.reference || ""} onChange={e => setRec({ ...rec, reference: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Note <span className="font-normal text-ink/40">(optional)</span></label>
              <input className="field" placeholder="e.g. camp balance — second instalment"
                value={rec.note || ""} onChange={e => setRec({ ...rec, note: e.target.value })} />
            </div>
          </div>
          {recError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{recError}</p>}
          <button className="btn-gold" onClick={recordPayment} disabled={recBusy}>
            {recBusy
              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : "Record payment"}
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div data-tour="payments-summary" className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total received" value={fmtNgn(total)} tint="emerald" />
        <SummaryCard label="This month" value={fmtNgn(monthTotal)} tint="gold" />
        <SummaryCard label="Successful payments" value={String(success.length)} tint="ink" />
      </div>

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
                      {p.camp && <span className="ml-2 pill-amber">☀️ {p.camp}</span>}
                    </td>
                    <td className="px-5 py-3 capitalize text-ink/60">{p.channel || "—"}</td>
                    <td className="px-5 py-3 text-right font-extrabold text-ink">{fmtNgn(Number(p.amount || 0))}</td>
                    <td className="px-5 py-3">
                      <span className={p.status === "success" ? "pill-green" : "pill-amber"}>{p.status}</span>
                    </td>
                  </tr>
                ))}
                {!visible.length && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-ink/40">No payments match your search.</td>
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
                  {p.camp && <span className="pill-amber">☀️ {p.camp}</span>}
                  {p.channel && <span className="capitalize">{p.channel}</span>}
                  <span className="ml-auto">{new Date(p.paid_at || p.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
                </div>
                <p className="mt-2 truncate font-mono text-[11px] text-ink/35">{p.reference}</p>
              </div>
            ))}
            {!visible.length && <div className="card p-10 text-center text-ink/40">No payments match your search.</div>}
          </div>
        </>
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
