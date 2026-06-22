"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import ConfirmModal from "@/components/ConfirmModal";
import PromptModal from "@/components/PromptModal";
import { useToast } from "@/components/Toast";

type App = Record<string, any>;
const FILTERS = ["all", "pending", "approved", "rejected"] as const;

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

export default function ApplicationsClient({ initial }: { initial: App[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [apps, setApps] = useState<App[]>(initial);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase.from("applications").select("*").order("created_at", { ascending: false });
    setApps(data ?? []);
  }

  const visible = apps
    .filter(a => filter === "all" || a.status === filter)
    .filter(a => !q || `${a.first_name} ${a.last_name} ${a.email} ${a.payment_ref}`.toLowerCase().includes(q.toLowerCase()));

  async function doApprove(id: string) {
    setConfirmState(null);
    setBusyId(id);
    const res = await fetch("/api/applications/approve", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    const json = await res.json();
    setBusyId(null);
    if (!res.ok) { push(`Approval failed: ${json.error}`, "error"); return; }
    push(`Approved — Student ID ${json.studentCode} emailed to the applicant.`, "success");
    reload();
  }

  async function doReject(id: string, reason: string) {
    setPromptId(null);
    setBusyId(id);
    await fetch("/api/applications/reject", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, reason }),
    });
    setBusyId(null);
    push("Application rejected — applicant notified.", "info");
    reload();
  }

  async function doDeleteApp(id: string) {
    setConfirmState(null);
    await supabase.from("applications").delete().eq("id", id);
    reload();
  }

  const counts = Object.fromEntries(FILTERS.map(f => [f, f === "all" ? apps.length : apps.filter(a => a.status === f).length]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Enrolment applications</h1>
        <p className="text-sm text-ink/45">{counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold capitalize ${filter === f ? "bg-ink text-white" : "bg-white border border-line text-ink/60"}`}>
            {f} ({counts[f]})
          </button>
        ))}
        <input className="field ml-auto max-w-xs" placeholder="Search name, email, payment ref…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {!visible.length && (
        <div className="card p-12 text-center text-ink/40">No {filter !== "all" ? filter : ""} applications.</div>
      )}

      {visible.map(a => (
        <article key={a.id} className={`card border-l-4 p-6 ${a.status === "approved" ? "border-l-emerald-500" : a.status === "rejected" ? "border-l-red-500" : "border-l-amber-400"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold">{a.first_name} {a.last_name}</h2>
              <p className="text-sm text-ink/50">{a.email} · {a.phone} · {a.level}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(a.subjects ?? []).map((s: string) => <span key={s} className="pill-blue">{s}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={a.status === "approved" ? "pill-green" : a.status === "rejected" ? "pill-red" : "pill-amber"}>{a.status}</span>
              {a.status === "rejected" && (
                <button className="text-xs font-bold text-red-600 hover:underline"
                  onClick={() => setConfirmState({
                    title: "Delete application?",
                    message: "This permanently removes the rejected application and cannot be undone.",
                    confirmLabel: "Delete",
                    danger: true,
                    onConfirm: () => doDeleteApp(a.id),
                  })}>Delete</button>
              )}
            </div>
          </div>

          <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
            <Info k="Payment ref" v={a.payment_ref} />
            {a.payment_verified && <div><dt className="text-[11px] font-bold uppercase tracking-wide text-ink/35">Status</dt><dd className="font-semibold"><span className="pill-green">✓ Verified</span></dd></div>}
            <Info k="Amount" v={`₦${a.payment_amount}`} />
            <Info k="Method" v={a.payment_method} />
            <Info k="Guardian" v={`${a.guardian_name} (${a.guardian_contact})`} />
          </dl>
          {a.notes && <p className="mt-3 rounded-xl bg-chalk px-4 py-2.5 text-[13px] text-ink/60">"{a.notes}"</p>}

          {a.status === "pending" && (
            <div className="mt-4 flex gap-3 border-t border-line pt-4">
              <button className="btn-gold flex-1" disabled={busyId === a.id}
                onClick={() => setConfirmState({
                  title: "Approve application?",
                  message: "This will create a student account and email login credentials to the applicant.",
                  confirmLabel: "Approve & create account",
                  onConfirm: () => doApprove(a.id),
                })}>
                {busyId === a.id
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : "Approve & create account"}
              </button>
              <button className="btn-danger flex-1" disabled={busyId === a.id}
                onClick={() => setPromptId(a.id)}>
                {busyId === a.id
                  ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  : "Reject"}
              </button>
            </div>
          )}
        </article>
      ))}

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
      {promptId && (
        <PromptModal
          title="Reject application"
          message="Optional: add a reason to include in the notification email."
          placeholder="e.g. Application incomplete, payment not received…"
          onConfirm={(reason) => doReject(promptId, reason)}
          onCancel={() => setPromptId(null)}
        />
      )}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/35">{k}</dt>
      <dd className="font-semibold text-ink/75">{v || "—"}</dd>
    </div>
  );
}
