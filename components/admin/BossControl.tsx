"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

type Group = { name: string; count: number };

// Admin: nominate a question group as this week's Boss Battle. Reuses the
// question-bank groups (a set is "mock-ready" at 20) so the Boss is a curated set.
export default function BossControl() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [current, setCurrent] = useState<{ name: string; questionCount: number; passPct: number; reward: number } | null>(null);
  const [group, setGroup] = useState("");
  const [passPct, setPassPct] = useState(70);
  const [reward, setReward] = useState(50);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    try {
      const [gr, br] = await Promise.all([
        fetch("/api/question-bank?groups=1", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/boss", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (Array.isArray(gr.groups)) setGroups(gr.groups);
      setCurrent(br?.boss ?? null);
      if (br?.boss && !group) setGroup(br.boss.name);
    } catch { /* keep */ }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!group) { setErr("Pick a group first."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      const r = await fetch("/api/boss", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", group_name: group, passPct, reward }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Couldn't set the Boss."); return; }
      setMsg(`“${group}” is now this week's Boss.`);
      await load();
    } finally { setBusy(false); }
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Icon name="trophy" className="h-5 w-5 text-gold-deep" /> Boss Battle
        <span className="rounded-full bg-gold-pale px-2 py-0.5 text-[11px] font-bold text-gold-deep">weekly</span>
      </h2>
      <p className="mt-1 text-sm text-ink/55">Make a question group this week's Boss — learners get one attempt and a reward for defeating it.</p>

      {current && (
        <p className="mt-3 rounded-xl bg-gold-pale/60 px-4 py-2.5 text-sm font-semibold text-ink">
          This week: <strong>{current.name}</strong> · {current.questionCount} questions · pass {current.passPct}% · reward {current.reward}
        </p>
      )}
      {err && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{err}</p>}
      {msg && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">{msg}</p>}

      {groups.length === 0 ? (
        <p className="mt-4 rounded-xl bg-chalk px-4 py-3 text-sm text-ink/60">No question groups yet — create one in the Question bank (tag questions with a group name), then come back.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="boss-group" className="flabel">Group</label>
            <select id="boss-group" className="field" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Choose a group…</option>
              {groups.map((g) => <option key={g.name} value={g.name}>{g.name} ({g.count})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="boss-pass" className="flabel">Pass %</label>
            <input id="boss-pass" type="number" min={10} max={100} className="field" value={passPct} onChange={(e) => setPassPct(Math.min(100, Math.max(10, Number(e.target.value) || 70)))} />
          </div>
          <div>
            <label htmlFor="boss-reward" className="flabel">Reward</label>
            <input id="boss-reward" type="number" min={0} max={1000} className="field" value={reward} onChange={(e) => setReward(Math.min(1000, Math.max(0, Number(e.target.value) || 0)))} />
          </div>
          <div className="sm:col-span-4">
            <button onClick={save} disabled={busy || !group} className="btn-gold !rounded-xl">{busy ? "Setting…" : "Set as this week's Boss"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
