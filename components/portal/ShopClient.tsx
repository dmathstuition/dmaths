"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";

type Item = { id: string; title: string; description: string | null; cost: number };
type Redemption = { id: string; title: string; cost: number; status: string; created_at: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-gold-pale text-gold-deep" },
  fulfilled: { label: "Fulfilled", cls: "bg-emerald-50 text-emerald-600" },
  rejected:  { label: "Declined",  cls: "bg-red-50 text-red-500" },
};

export default function ShopClient({
  earned, balance, items, initialRedemptions,
}: {
  earned: number;
  balance: number;
  items: Item[];
  initialRedemptions: Redemption[];
}) {
  const [bal, setBal] = useState(balance);
  const [redemptions, setRedemptions] = useState<Redemption[]>(initialRedemptions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function redeem(item: Item) {
    setBusyId(item.id); setErr("");
    const res = await fetch("/api/rewards/redeem", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) { setErr(json.error || "Couldn't redeem — please try again."); return; }
    setBal(json.spendable);
    setRedemptions((prev) => [json.redemption, ...prev]);
  }

  return (
    <div className="space-y-6">
      {/* Balance header */}
      <Reveal>
        <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
              <Icon name="trophy" className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">Rewards shop</h1>
              <p className="mt-1 text-sm text-white/55">
                <span className="font-bold text-gold">{bal}</span> points to spend
                <span className="text-white/40"> · {earned} earned all-time</span>
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}

      {/* Catalogue */}
      <Reveal delay={40}>
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const afford = bal >= item.cost;
              return (
                <div key={item.id} className="card neu-card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                      <Icon name="trophy" className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold text-ink">{item.cost} pts</span>
                  </div>
                  <p className="mt-3 font-display text-base font-bold text-ink">{item.title}</p>
                  {item.description && <p className="mt-1 flex-1 text-sm text-ink/55">{item.description}</p>}
                  <button
                    onClick={() => redeem(item)}
                    disabled={!afford || busyId === item.id}
                    className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition ${
                      afford ? "btn-gold" : "cursor-not-allowed bg-chalk text-ink/40"}`}>
                    {busyId === item.id ? "Redeeming…" : afford ? "Redeem" : `Need ${item.cost - bal} more`}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink/40">
            <Icon name="trophy" className="h-8 w-8" />
            <p className="text-sm">No rewards in the shop yet — check back soon!</p>
          </div>
        )}
      </Reveal>

      {/* My redemptions */}
      {redemptions.length > 0 && (
        <Reveal delay={80}>
          <div className="card neu-card p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">My redemptions</h2>
            <div className="divide-y divide-line/60">
              {redemptions.map((r) => {
                const s = STATUS[r.status] ?? STATUS.pending;
                return (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{r.title}</p>
                      <p className="text-xs text-ink/40">
                        {r.cost} pts · {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${s.cls}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-ink/45">
              Pending &amp; fulfilled redemptions hold your points; a declined one returns them.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
