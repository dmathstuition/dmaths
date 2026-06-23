"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icons";

interface BehaviorType {
  id: string; name: string; category: "positive" | "negative";
  points: number; icon: string; color: string;
}
interface Log {
  id: string; created_at: string; notes?: string;
  behavior_type_id: string;
}

export default function BehaviorClient({
  rewardPoints, sanctionPoints, logs, behaviorTypes,
}: {
  rewardPoints: number; sanctionPoints: number; logs: Log[]; behaviorTypes: BehaviorType[];
}) {
  const [tab, setTab] = useState<"positive" | "negative">("positive");

  const receivedIds = new Set(logs.map(l => l.behavior_type_id));
  const tabTypes = behaviorTypes.filter(t => t.category === tab);
  const tabLogs = logs.filter(l => behaviorTypes.find(t => t.id === l.behavior_type_id)?.category === tab);

  return (
    <div className="space-y-6">
      {/* Score bubbles */}
      <div className="card flex flex-wrap items-center justify-center gap-10 p-8">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-200">
            <span className="font-display text-3xl font-extrabold text-white">+{rewardPoints}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-emerald-600">Reward pts</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-200">
            <span className="font-display text-3xl font-extrabold text-white">{sanctionPoints}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-red-500">Sanction pts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-line bg-chalk p-1 w-fit">
        {(["positive", "negative"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-6 py-2 text-sm font-semibold capitalize transition ${tab === t
              ? t === "positive" ? "bg-emerald-500 text-white shadow" : "bg-red-500 text-white shadow"
              : "text-ink/45 hover:text-ink"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Behaviour type grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tabTypes.map(bt => {
          const earned = receivedIds.has(bt.id);
          return (
            <div key={bt.id}
              className={`rounded-2xl border p-4 text-center transition ${earned ? "border-transparent shadow-md" : "border-line opacity-40"}`}
              style={earned ? { background: `${bt.color}15`, borderColor: `${bt.color}40` } : undefined}
            >
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ background: earned ? bt.color : "#94a3b8" }}>
                <Icon name={bt.icon as IconName} />
              </div>
              <p className="text-xs font-bold text-ink leading-tight">{bt.name}</p>
              <p className="mt-0.5 text-[10px] font-semibold" style={{ color: bt.color }}>
                {bt.points > 0 ? `+${bt.points}` : bt.points} pts
              </p>
            </div>
          );
        })}
        {tabTypes.length === 0 && <p className="col-span-full py-6 text-center text-sm text-ink/40">No behaviours defined.</p>}
      </div>

      {/* History */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">History</h2>
        {tabLogs.length === 0 && <p className="text-sm text-ink/40">No {tab} entries yet.</p>}
        <div className="space-y-2">
          {tabLogs.map(l => {
            const bt = behaviorTypes.find(t => t.id === l.behavior_type_id);
            const isPos = bt?.category === "positive";
            return (
              <div key={l.id} className="flex items-start gap-3 rounded-xl px-4 py-2.5 bg-chalk">
                <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white ${isPos ? "bg-emerald-500" : "bg-red-500"}`}>
                  {bt?.points > 0 ? `+${bt.points}` : bt?.points}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{bt?.name}</p>
                  {l.notes && <p className="text-xs text-ink/50 italic">"{l.notes}"</p>}
                </div>
                <span className="flex-shrink-0 text-xs text-ink/35">
                  {new Date(l.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
