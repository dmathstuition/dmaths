"use client";
import { useState } from "react";
import { findTier, fmtNgn } from "@/lib/summerCamp";

type Payment = Record<string, any>;

export default function PaymentsClient({ initial }: { initial: Payment[] }) {
  const [q, setQ] = useState("");

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
        {visible.length > 0 && (
          <button onClick={exportCsv} className="btn-ghost !min-h-[40px] text-sm">Export CSV</button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total received" value={fmtNgn(total)} tint="emerald" />
        <SummaryCard label="This month" value={fmtNgn(monthTotal)} tint="gold" />
        <SummaryCard label="Successful payments" value={String(success.length)} tint="ink" />
      </div>

      <input
        className="field max-w-sm"
        placeholder="Search reference, email, package…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {initial.length === 0 ? (
        <div className="card p-12 text-center text-ink/45">
          <p className="font-semibold text-ink/60">No payments recorded yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm">
            Once Paystack is live and the <code className="rounded bg-chalk px-1">payments</code> migration has been
            run, every verified card/bank payment appears here automatically.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
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
        </div>
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
