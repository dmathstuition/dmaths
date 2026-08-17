"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";
import { useBulkSelect } from "@/lib/useBulkSelect";
import BulkBar from "@/components/admin/BulkBar";

type Student = { id: string; first_name: string | null; last_name: string | null; student_code: string | null };
type ClassRow = { id: string; subject: string; starts_at: string };
type Batch = { title: string; created_at: string; done: number; total: number; batch_id: string | null };
type Audience = "student" | "all" | "level" | "subject" | "class";

export default function DailyTasksClient({ students, levels, subjects, classes, batches }: {
  students: Student[]; levels: string[]; subjects: string[]; classes: ClassRow[]; batches: Batch[];
}) {
  const router = useRouter();
  const push = useToast();
  const [type, setType] = useState<Audience>("student");
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const name = (s: Student) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.student_code || "Student";
  const options: { id: Audience; label: string; icon: any }[] = [
    { id: "student", label: "A learner", icon: "profile" },
    { id: "all", label: "Everyone", icon: "students" },
    { id: "level", label: "By level", icon: "graduationCap" },
    { id: "subject", label: "By subject", icon: "curriculum" },
    { id: "class", label: "A class", icon: "classes" },
  ];

  async function post() {
    if (!title.trim()) { push("Enter a task title.", "error"); return; }
    if (type !== "all" && !value) { push("Choose a target.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/daily-tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, value, title, details }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not post the task.", "error"); return; }
    push(`Task sent to ${j.created} learner${j.created === 1 ? "" : "s"}.`, "success");
    setTitle(""); setDetails(""); setValue("");
    router.refresh();
  }

  async function withdraw(batchId: string | null) {
    if (!batchId || !confirm("Withdraw the unfinished copies of this task?")) return;
    const res = await fetch(`/api/daily-tasks?batchId=${batchId}`, { method: "DELETE" });
    if (!res.ok) { push("Could not withdraw it.", "error"); return; }
    push("Unfinished tasks withdrawn.", "success");
    router.refresh();
  }

  const sel = useBulkSelect();
  const [bulkBusy, setBulkBusy] = useState(false);
  // Only batches with unfinished copies (and a real batch id) can be withdrawn.
  const withdrawable = batches.filter((b) => b.batch_id && b.done < b.total).map((b) => b.batch_id!) as string[];
  async function bulkWithdraw() {
    const ids = sel.list;
    if (!ids.length || !confirm(`Withdraw the unfinished copies of ${ids.length} task${ids.length === 1 ? "" : "s"}?`)) return;
    setBulkBusy(true);
    const results = await Promise.all(ids.map((id) => fetch(`/api/daily-tasks?batchId=${id}`, { method: "DELETE" })));
    setBulkBusy(false);
    const failed = results.filter((r) => !r.ok).length;
    push(failed ? `${ids.length - failed} withdrawn, ${failed} failed.` : `${ids.length} task${ids.length === 1 ? "" : "s"} withdrawn.`, failed ? "error" : "success");
    sel.clear();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="checkCircle" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Task of the day</h1>
          <p className="mt-1 text-sm text-white/50">Post a task — it pops up in the learner's portal, is notified, and stays until they mark it done.</p>
        </div>
      </div>

      <div className="card p-6">
        <p className="flabel">Send to</p>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {options.map(o => (
            <button key={o.id} type="button" onClick={() => { setType(o.id); setValue(""); }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                type === o.id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              <Icon name={o.icon} className="h-4 w-4" /> <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>

        {type === "student" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a learner…</option>
            {students.map(s => <option key={s.id} value={s.id}>{name(s)}{s.student_code ? ` · ${s.student_code}` : ""}</option>)}
          </select>
        )}
        {type === "level" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a level…</option>{levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {type === "subject" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a subject…</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {type === "class" && (
          <select className="field mt-3" value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose a class…</option>{classes.map(c => <option key={c.id} value={c.id}>{c.subject} · {fmtWAT(c.starts_at)}</option>)}
          </select>
        )}
        {type === "all" && <p className="mt-3 text-[13px] text-ink/50">Goes to every active learner.</p>}

        <label htmlFor="dailyt-task-title" className="flabel mt-5 block">Task title</label>
        <input id="dailyt-task-title" className="field" value={title} maxLength={160} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Exercise 4B, questions 1–10" />
        <label htmlFor="dailyt-details-optional" className="flabel mt-4 block">Details <span className="text-ink/40">(optional)</span></label>
        <textarea id="dailyt-details-optional" className="field min-h-[90px]" value={details} maxLength={2000} onChange={e => setDetails(e.target.value)} placeholder="Any instructions or context for the task…" />

        <button className="btn-gold mt-4 inline-flex items-center gap-2" onClick={post} disabled={busy}>
          <Icon name="checkCircle" className="h-4 w-4" /> {busy ? "Posting…" : "Post task"}
        </button>
      </div>

      <BulkBar count={sel.size} noun="task" onClear={sel.clear}>
        <button onClick={bulkWithdraw} disabled={bulkBusy}
          className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50">Withdraw selected</button>
      </BulkBar>

      <div className="card neu-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Recent tasks ({batches.length})</h2>
          {withdrawable.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-ink/60">
              <input type="checkbox" className="h-4 w-4"
                checked={sel.allSelected(withdrawable)}
                onChange={e => e.target.checked ? sel.selectOnly(withdrawable) : sel.clear()} />
              Select all unfinished
            </label>
          )}
        </div>
        {batches.length ? (
          <div className="divide-y divide-line/60">
            {batches.map((b, i) => {
              const canWithdraw = b.done < b.total && !!b.batch_id;
              return (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${b.batch_id && sel.has(b.batch_id) ? "bg-gold-pale/40" : ""}`}>
                {canWithdraw ? (
                  <input type="checkbox" className="h-4 w-4 flex-shrink-0" aria-label="Select this task"
                    checked={sel.has(b.batch_id!)} onChange={() => sel.toggle(b.batch_id!)} />
                ) : <span className="w-4 flex-shrink-0" />}
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-pale text-gold-deep"><Icon name="checkCircle" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{b.title}</p>
                  <p className="text-xs text-ink/50">{new Date(b.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · <span className="font-semibold text-emerald-600">{b.done}</span>/{b.total} done</p>
                </div>
                {canWithdraw && (
                  <button onClick={() => withdraw(b.batch_id)} className="flex-shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Withdraw</button>
                )}
              </div>
              );
            })}
          </div>
        ) : <p className="p-6 text-center text-sm text-ink/40">No tasks posted yet.</p>}
      </div>
    </div>
  );
}
