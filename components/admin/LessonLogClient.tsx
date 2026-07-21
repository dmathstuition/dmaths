"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";

type ClassRow = { id: string; subject: string; starts_at: string; tutor: string | null };
type Entry = { id: string; class_id: string; topic: string; notes: string; homework: string; taught_on: string; class_label: string };

export default function LessonLogClient({ classes, entries }: { classes: ClassRow[]; entries: Entry[] }) {
  const router = useRouter();
  const push = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ classId: "", topic: "", notes: "", homework: "", taughtOn: today });
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!f.classId) { push("Choose a class.", "error"); return; }
    if (!f.topic.trim()) { push("Enter the topic taught.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/lesson-notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not save the entry.", "error"); return; }
    push("Lesson logged.", "success");
    setF({ classId: f.classId, topic: "", notes: "", homework: "", taughtOn: today });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this lesson entry?")) return;
    const res = await fetch(`/api/lesson-notes?id=${id}`, { method: "DELETE" });
    if (!res.ok) { push("Could not delete it.", "error"); return; }
    push("Entry deleted.", "success");
    router.refresh();
  }

  const visible = filter ? entries.filter(e => e.class_id === filter) : entries;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="book" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Lesson log</h1>
          <p className="mt-1 text-sm text-white/50">Record what was covered each session — topic, notes and homework set.</p>
        </div>
      </div>

      {/* Add entry */}
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Log a lesson</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="flabel">Class</label>
            <select className="field" value={f.classId} onChange={e => setF({ ...f, classId: e.target.value })}>
              <option value="">Choose a class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.subject} · {fmtWAT(c.starts_at)}</option>)}
            </select>
          </div>
          <div>
            <label className="flabel">Date taught</label>
            <input type="date" className="field" value={f.taughtOn} onChange={e => setF({ ...f, taughtOn: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="flabel">Topic</label>
            <input className="field" value={f.topic} onChange={e => setF({ ...f, topic: e.target.value })}
              placeholder="e.g. Quadratic equations — completing the square" />
          </div>
          <div>
            <label className="flabel">Notes <span className="text-ink/40">(optional)</span></label>
            <textarea className="field min-h-[70px]" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })}
              placeholder="What went well, who needs support, next steps…" />
          </div>
          <div>
            <label className="flabel">Homework set <span className="text-ink/40">(optional)</span></label>
            <textarea className="field min-h-[70px]" value={f.homework} onChange={e => setF({ ...f, homework: e.target.value })}
              placeholder="e.g. Exercise 4B, questions 1–10" />
          </div>
        </div>
        <button className="btn-gold mt-4 inline-flex items-center gap-2" onClick={add} disabled={busy}>
          <Icon name="plusSquare" className="h-4 w-4" /> {busy ? "Saving…" : "Log lesson"}
        </button>
      </div>

      {/* History */}
      <div className="card neu-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">History ({visible.length})</h2>
          <select className="field !min-h-[38px] w-auto py-1.5 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.subject}</option>)}
          </select>
        </div>
        {visible.length ? (
          <div className="divide-y divide-line/60">
            {visible.map(e => (
              <div key={e.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{e.topic}</p>
                    <p className="mt-0.5 text-xs text-ink/45">
                      {e.class_label} · {new Date(e.taught_on).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <button onClick={() => remove(e.id)} className="flex-shrink-0 rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Delete</button>
                </div>
                {e.notes && <p className="mt-2 text-sm text-ink/70">{e.notes}</p>}
                {e.homework && (
                  <p className="mt-2 rounded-lg bg-gold-pale px-3 py-2 text-[13px] font-semibold text-gold-deep">
                    <Icon name="assignments" className="mr-1 inline h-3.5 w-3.5" /> Homework: {e.homework}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-ink/40">No lessons logged yet.</p>
        )}
      </div>
    </div>
  );
}
