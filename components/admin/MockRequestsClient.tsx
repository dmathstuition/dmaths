"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import { EXAM_PRESETS } from "@/lib/mockExam";
import { reqStatusMeta } from "@/lib/mockRequests";

type Student = { id: string; first_name: string | null; last_name: string | null; student_code: string | null; level: string | null };
type Req = {
  id: string; student_id: string; subject: string; preset: string; level: string;
  status: string; scheduled_for: string | null; note: string; created_at: string;
  student: { first_name: string | null; last_name: string | null; student_code: string | null } | null;
};

const nameOf = (s: { first_name: string | null; last_name: string | null } | null) =>
  `${s?.first_name ?? ""} ${s?.last_name ?? ""}`.trim() || "Learner";
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export default function MockRequestsClient({ students }: { students: Student[] }) {
  const [requests, setRequests] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [sched, setSched] = useState<Record<string, string>>({});

  // Launch form
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lSubject, setLSubject] = useState("");
  const [lPreset, setLPreset] = useState("quick");
  const [lSched, setLSched] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/mock-requests", { cache: "no-store" });
      const j = await r.json();
      if (j.error) setErr(j.error);
      setRequests(j.requests ?? []);
    } catch { setErr("Couldn't load requests."); }
  }
  useEffect(() => { load(); }, []);

  async function act(payload: any, key: string) {
    setBusy(key); setErr(""); setMsg("");
    try {
      const r = await fetch("/api/mock-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Action failed."); return false; }
      await load();
      return true;
    } catch { setErr("Action failed."); return false; }
    finally { setBusy(null); }
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 20);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return students.filter((s) => !f || `${nameOf(s)} ${s.student_code ?? ""} ${s.level ?? ""}`.toLowerCase().includes(f)).slice(0, 60);
  }, [students, filter]);

  function toggle(id: string) {
    setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function launch() {
    if (!picked.size) { setErr("Pick at least one learner."); return; }
    const ok = await act({ action: "launch", studentIds: [...picked], subject: lSubject.trim(), preset: lPreset, scheduledFor: toIso(lSched) }, "launch");
    if (ok) { setMsg(`Mock launched to ${picked.size} learner${picked.size === 1 ? "" : "s"}.`); setPicked(new Set()); setLSubject(""); setLSched(""); }
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25"><Icon name="graduationCap" className="h-6 w-6" /></span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Mock exam requests</h1>
          <p className="mt-1 text-sm text-white/50">Approve learner requests (optionally schedule a start time), or launch a mock to a class.</p>
        </div>
      </div>

      {err && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{err}</p>}
      {msg && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{msg}</p>}

      {/* Pending queue */}
      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="clock" className="h-5 w-5 text-gold-deep" /> Awaiting approval
          {pending.length > 0 && <span className="rounded-full bg-gold-pale px-2 py-0.5 text-[11px] font-bold text-gold-deep">{pending.length}</span>}
        </h2>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">No pending requests. 🎉</p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => {
              const p = EXAM_PRESETS.find((x) => x.key === r.preset);
              return (
                <div key={r.id} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{nameOf(r.student)} <span className="font-mono text-[11px] text-ink/40">{r.student?.student_code}</span></p>
                      <p className="text-[12px] text-ink/50">{r.subject || "Any subject"} · {p?.label ?? r.preset} · {r.level || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-bold text-ink/50">Open at (optional)</span>
                      <input type="datetime-local" className="field !py-2 !text-[13px]" value={sched[r.id] ?? ""} onChange={(e) => setSched((s) => ({ ...s, [r.id]: e.target.value }))} />
                    </label>
                    <button onClick={() => act({ action: "approve", id: r.id, scheduledFor: toIso(sched[r.id] ?? "") }, `a:${r.id}`)} disabled={busy === `a:${r.id}`}
                      className="btn-gold !min-h-[38px] !rounded-xl">{busy === `a:${r.id}` ? "…" : "Approve"}</button>
                    <button onClick={() => act({ action: "decline", id: r.id }, `d:${r.id}`)} disabled={busy === `d:${r.id}`}
                      className="btn-ghost !min-h-[38px] !rounded-xl">Decline</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Launch a mock to learners */}
      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-ink"><Icon name="notices" className="h-5 w-5 text-gold-deep" /> Launch a mock</h2>
        <p className="mb-4 text-[13px] text-ink/50">Set a mock for chosen learners — they&apos;re notified and it opens (at the scheduled time, if set), filtered to each learner&apos;s class.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="flabel">Subject</span>
            <input className="field" placeholder="Any subject" value={lSubject} onChange={(e) => setLSubject(e.target.value)} /></label>
          <label className="block"><span className="flabel">Paper</span>
            <select className="field" value={lPreset} onChange={(e) => setLPreset(e.target.value)}>{EXAM_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
          <label className="block"><span className="flabel">Open at (optional)</span>
            <input type="datetime-local" className="field" value={lSched} onChange={(e) => setLSched(e.target.value)} /></label>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flabel !mb-0">Learners <span className="text-ink/40">({picked.size} selected)</span></span>
            <input className="field !w-48 !py-1.5 !text-[13px]" placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-line p-2">
            {shown.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm hover:bg-chalk">
                <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-gold" />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink/80">{nameOf(s)}</span>
                <span className="flex-shrink-0 text-[11px] text-ink/40">{s.level || "—"}</span>
              </label>
            ))}
            {!shown.length && <p className="py-4 text-center text-sm text-ink/40">No learners match.</p>}
          </div>
        </div>
        <button onClick={launch} disabled={busy === "launch" || !picked.size} className="btn-gold mt-4 !rounded-xl disabled:opacity-50">
          {busy === "launch" ? "Launching…" : <span className="inline-flex items-center gap-1.5"><Icon name="notices" className="h-4 w-4" /> Launch mock to {picked.size || ""} learner{picked.size === 1 ? "" : "s"}</span>}
        </button>
      </div>

      {/* Recent decisions */}
      {resolved.length > 0 && (
        <div className="card p-6">
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Recent</h2>
          <div className="divide-y divide-line/60">
            {resolved.map((r) => {
              const sm = reqStatusMeta(r.status);
              return (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">{nameOf(r.student)}</p>
                    <p className="text-[11px] text-ink/45">{r.subject || "Any"} · {r.level || "—"}{r.scheduled_for ? ` · opens ${new Date(r.scheduled_for).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${sm.cls}`}>{sm.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
