"use client";
import { useState } from "react";
import Link from "next/link";

export default function BehaviorOverviewClient({ logs }: { logs: any[] }) {
  const [tab, setTab] = useState<"all" | "positive" | "negative">("all");
  const [q, setQ] = useState("");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = logs.filter(l => new Date(l.created_at) >= weekAgo);
  const weekPos = thisWeek.filter(l => l.behavior_type?.category === "positive").length;
  const weekNeg = thisWeek.filter(l => l.behavior_type?.category === "negative").length;

  const visible = logs.filter(l => {
    if (tab === "positive" && l.behavior_type?.category !== "positive") return false;
    if (tab === "negative" && l.behavior_type?.category !== "negative") return false;
    if (q) {
      const name = `${l.student?.first_name ?? ""} ${l.student?.last_name ?? ""}`.toLowerCase();
      if (!name.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Behaviour log</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">This week</p>
          <p className="mt-1 font-display text-2xl font-semibold text-emerald-600">+{weekPos}</p>
          <p className="text-xs text-ink/40">positive</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">This week</p>
          <p className="mt-1 font-display text-2xl font-semibold text-red-500">{weekNeg}</p>
          <p className="text-xs text-ink/40">negative</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">Total logs</p>
          <p className="mt-1 font-display text-2xl font-semibold">{logs.length}</p>
          <p className="text-xs text-ink/40">all time</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink/40">Showing</p>
          <p className="mt-1 font-display text-2xl font-semibold">{visible.length}</p>
          <p className="text-xs text-ink/40">filtered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-line bg-chalk p-1">
          {(["all", "positive", "negative"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition ${tab === t ? "bg-white shadow text-ink" : "text-ink/45 hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search by student name…"
          className="field max-w-xs" />
      </div>

      {/* Log */}
      <div className="card divide-y divide-line/60">
        {visible.length === 0 && <p className="p-6 text-center text-sm text-ink/40">No entries match.</p>}
        {visible.map(l => {
          const isPos = l.behavior_type?.category === "positive";
          const pts = l.behavior_type?.points ?? 0;
          return (
            <div key={l.id} className="flex items-center gap-4 px-5 py-3">
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${isPos ? "bg-emerald-500" : "bg-red-500"}`}>
                {pts > 0 ? `+${pts}` : pts}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                  <Link href={`/admin/students/${l.student_id}`} className="hover:text-gold-deep">
                    {l.student?.first_name} {l.student?.last_name}
                  </Link>
                  <span className="ml-2 font-normal text-ink/55">· {l.behavior_type?.name}</span>
                </p>
                {l.notes && <p className="text-xs text-ink/40 truncate">{l.notes}</p>}
              </div>
              <span className="flex-shrink-0 text-xs text-ink/35">
                {new Date(l.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
