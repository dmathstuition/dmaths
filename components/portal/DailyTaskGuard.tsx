"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";

type Task = { id: string; title: string; details: string | null };

// Shows the learner their "Task of the day": pops a modal once per session on
// portal visit, then keeps a docked pill until the task is marked done. Fetches
// only the learner's own open tasks (RLS). No-ops before the migration is run.
export default function DailyTaskGuard() {
  const push = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabaseBrowser()
        .from("daily_tasks").select("id, title, details").eq("done", false).order("created_at", { ascending: false });
      if (!alive || error || !data?.length) return;
      setTasks(data as Task[]);
      const key = `dmaths-task-seen-${data[0].id}`;
      try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); setOpen(true); } } catch { setOpen(true); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const active = tasks[0];

  async function complete() {
    if (!active) return;
    setBusy(true);
    const res = await fetch("/api/daily-tasks/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, response: note }),
    });
    setBusy(false);
    if (!res.ok) { push("Could not submit — try again.", "error"); return; }
    push("Task completed! 🎉", "success");
    setTasks((t) => t.slice(1));
    setNote("");
    setOpen(false);
  }

  if (!active) return null;

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Open your task of the day"
          className="fixed bottom-24 right-4 z-[65] flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-board shadow-xl ring-1 ring-black/5 transition hover:scale-105 lg:bottom-5">
          <Icon name="checkCircle" className="h-4 w-4" /> Task of the day
        </button>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Task of the day" className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setOpen(false)} className="absolute inset-0 bg-board/60 backdrop-blur-md" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-board px-6 py-5 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-board">📌 Task of the day</span>
              <h2 className="mt-2 font-display text-xl font-bold">{active.title}</h2>
            </div>
            <div className="p-6">
              {active.details && <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{active.details}</p>}
              <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink/40">Your note (optional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000}
                placeholder="Add a response or how you got on…" className="field mt-1 w-full resize-y text-sm" />
              <div className="mt-4 flex items-center gap-2">
                <button onClick={complete} disabled={busy} className="btn-gold flex-1">{busy ? "Submitting…" : "Mark as done"}</button>
                <button onClick={() => setOpen(false)} className="btn-ghost">Later</button>
              </div>
              {tasks.length > 1 && <p className="mt-3 text-center text-[11px] text-ink/40">{tasks.length - 1} more task{tasks.length - 1 > 1 ? "s" : ""} after this.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
