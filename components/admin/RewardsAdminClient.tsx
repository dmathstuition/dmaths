"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Icon } from "@/components/Icons";

type Item = { id: string; title: string; description: string | null; cost: number; active: boolean };
type Pending = {
  id: string; title: string; cost: number; created_at: string;
  student: { first_name: string | null; last_name: string | null; student_code: string | null } | null;
};

export default function RewardsAdminClient({
  initialItems, initialPending,
}: {
  initialItems: Item[];
  initialPending: Pending[];
}) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [pending, setPending] = useState<Pending[]>(initialPending);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim(); const c = Number(cost);
    if (!t || !Number.isFinite(c) || c <= 0) { push("Enter a title and a points cost above 0.", "error"); return; }
    setBusy(true);
    const { data, error } = await supabase.from("reward_items")
      .insert({ title: t.slice(0, 120), description: desc.trim(), cost: Math.round(c) })
      .select("id, title, description, cost, active").single();
    setBusy(false);
    if (error || !data) { push(error?.message || "Could not add reward. Run migration-rewards-shop.sql?", "error"); return; }
    setItems((prev) => [data as Item, ...prev]);
    setTitle(""); setDesc(""); setCost("");
    push("Reward added.", "success");
  }

  async function toggle(item: Item) {
    const next = !item.active;
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, active: next } : x)));
    const { error } = await supabase.from("reward_items").update({ active: next }).eq("id", item.id);
    if (error) setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, active: !next } : x)));
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.title}"? Existing redemptions keep their record.`)) return;
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    const { error } = await supabase.from("reward_items").delete().eq("id", item.id);
    if (error) { setItems((prev) => [item, ...prev]); push("Could not delete.", "error"); }
  }

  async function resolve(r: Pending, action: "fulfill" | "reject") {
    setPending((prev) => prev.filter((x) => x.id !== r.id)); // optimistic
    const res = await fetch("/api/rewards/resolve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, action }),
    });
    if (!res.ok) {
      setPending((prev) => [r, ...prev]);
      const j = await res.json().catch(() => ({}));
      push(j.error || "Could not update.", "error");
      return;
    }
    push(action === "fulfill" ? "Marked fulfilled." : "Redemption declined (points returned).", "success");
  }

  const name = (p: Pending) =>
    `${p.student?.first_name ?? ""} ${p.student?.last_name ?? ""}`.trim() || p.student?.student_code || "Learner";

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="trophy" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Rewards shop</h1>
          <p className="mt-1 text-sm text-white/50">List perks learners can spend their reward points on, and fulfil redemptions.</p>
        </div>
      </div>

      {/* Pending redemptions */}
      <div className="card neu-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Pending redemptions {pending.length > 0 && <span className="ml-1 rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-board">{pending.length}</span>}
        </h2>
        {pending.length ? (
          <div className="divide-y divide-line/60">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{name(r)} <span className="font-normal text-ink/40">wants</span> {r.title}</p>
                  <p className="text-xs text-ink/40">
                    {r.cost} pts · {r.student?.student_code ?? ""} · {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button onClick={() => resolve(r, "fulfill")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600">Fulfil</button>
                  <button onClick={() => resolve(r, "reject")} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">Decline</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-ink/40">No redemptions waiting.</p>
        )}
      </div>

      {/* Catalogue management */}
      <div className="card neu-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">Catalogue</h2>

        <form onSubmit={addItem} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
          <input className="field" placeholder="Reward title (e.g. ₦500 airtime)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="field" placeholder="Short description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input className="field" type="number" min={1} placeholder="Cost (pts)" value={cost} onChange={(e) => setCost(e.target.value)} />
          <button className="btn-gold flex-shrink-0" disabled={busy}>{busy ? "Adding…" : "Add"}</button>
        </form>

        <div className="mt-4 divide-y divide-line/60">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${item.active ? "text-ink" : "text-ink/40 line-through"}`}>{item.title}</p>
                {item.description && <p className="truncate text-xs text-ink/45">{item.description}</p>}
              </div>
              <span className="flex-shrink-0 rounded-full bg-ink/10 px-2.5 py-1 text-xs font-bold text-ink">{item.cost} pts</span>
              <button onClick={() => toggle(item)}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${item.active ? "bg-emerald-50 text-emerald-600" : "bg-chalk text-ink/50"}`}>
                {item.active ? "Active" : "Hidden"}
              </button>
              <button onClick={() => remove(item)} aria-label="Delete reward"
                className="flex-shrink-0 rounded-lg p-1.5 text-ink/30 transition hover:bg-red-50 hover:text-red-500">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!items.length && <p className="py-6 text-center text-sm text-ink/40">No rewards yet — add your first above.</p>}
        </div>
      </div>
    </div>
  );
}
