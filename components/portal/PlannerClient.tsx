"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";

type Task = { id: string; title: string; done: boolean; due_date: string | null; created_at: string };
type Upcoming = { id: string; title: string; subject: string; due_date: string };

// Friendly "due" label + tone for a dated item.
function due(dateStr: string): { text: string; tone: "red" | "gold" | "muted" } {
  const days = Math.ceil((new Date(`${dateStr}T00:00:00+01:00`).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "red" };
  if (days === 0) return { text: "Due today", tone: "red" };
  if (days === 1) return { text: "Due tomorrow", tone: "gold" };
  return { text: `Due in ${days} days`, tone: "muted" };
}
const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-500",
  gold: "bg-gold-pale text-gold-deep",
  muted: "bg-chalk text-ink/45",
};

export default function PlannerClient({
  studentId, initialTasks, upcoming,
}: {
  studentId: string;
  initialTasks: Task[];
  upcoming: Upcoming[];
}) {
  const supabase = supabaseBrowser();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase.from("student_tasks")
      .insert({ student_id: studentId, title: t.slice(0, 200), due_date: dueDate || null })
      .select("id, title, done, due_date, created_at").single();
    setBusy(false);
    if (error || !data) { setErr("Couldn't add that — please try again."); return; }
    setTasks((prev) => [data as Task, ...prev]);
    setTitle(""); setDueDate("");
  }

  async function toggle(task: Task) {
    const next = !task.done;
    setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, done: next } : x)));
    const { error } = await supabase.from("student_tasks").update({ done: next }).eq("id", task.id);
    if (error) setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, done: !next } : x)));
  }

  async function remove(task: Task) {
    setTasks((prev) => prev.filter((x) => x.id !== task.id));
    const { error } = await supabase.from("student_tasks").delete().eq("id", task.id);
    if (error) setTasks((prev) => [task, ...prev]);
  }

  const total = tasks.length;
  const allDone = total > 0 && open.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#EEF2FE] via-[#E2ECFB] to-[#DCE7F6] p-7 dark:from-[#10406F] dark:via-[#0A2A4F] dark:to-[#071C36]">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/45">
<Icon name="sparkles" className="h-3.5 w-3.5" /> My plan
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Stay on top of your work</h1>
          <p className="mt-1 text-sm text-ink/55">
            {total === 0
              ? "Add your own study tasks — and see what's due from class."
              : allDone
              ? "Everything's ticked off — brilliant! 🎉"
              : `${open.length} task${open.length === 1 ? "" : "s"} to go${done.length ? ` · ${done.length} done` : ""}.`}
          </p>
        </div>
      </Reveal>

      {/* From your classes (read-only) */}
      <Reveal delay={40}>
        <div className="card neu-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">From your classes</h2>
            <Link href="/portal/assignments" className="text-sm font-bold text-gold-deep hover:underline">All →</Link>
          </div>
          {upcoming.length ? (
            <div className="space-y-1">
              {upcoming.map((a) => {
                const d = due(a.due_date);
                return (
                  <div key={a.id} className="-mx-2 flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-pale text-gold-deep">
                      <Icon name="assignments" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{a.title}</p>
                      <p className="truncate text-xs text-ink/45">{a.subject}</p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONE[d.tone]}`}>{d.text}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink/40">No assignments due — you&apos;re all caught up!</p>
          )}
        </div>
      </Reveal>

      {/* My tasks */}
      <Reveal delay={80}>
        <div className="card neu-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">My tasks</h2>

          <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
            <input className="field flex-1" placeholder="Add a study task…" maxLength={200}
              value={title} onChange={(e) => setTitle(e.target.value)} />
            <input type="date" className="field sm:w-44" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date (optional)" />
            <button className="btn-gold flex-shrink-0" disabled={busy || !title.trim()}>{busy ? "Adding…" : "Add"}</button>
          </form>
          {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}

          <div className="mt-4 space-y-1">
            {open.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
            ))}
            {done.length > 0 && (
              <>
                <p className="mt-4 mb-1 text-[11px] font-bold uppercase tracking-wide text-ink/35">Done</p>
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
                ))}
              </>
            )}
            {total === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-ink/25">
                <Icon name="checkCircle" className="h-8 w-8" />
                <p className="text-sm">No tasks yet — add your first above.</p>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function TaskRow({ task, onToggle, onRemove }: { task: Task; onToggle: (t: Task) => void; onRemove: (t: Task) => void }) {
  const d = task.due_date ? due(task.due_date) : null;
  return (
    <div className="group -mx-2 flex items-center gap-3 rounded-xl border border-transparent p-2 transition hover:border-line hover:bg-chalk/60">
      <button type="button" onClick={() => onToggle(task)} aria-label={task.done ? "Mark not done" : "Mark done"}
        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${
          task.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line hover:border-gold"}`}>
        {task.done && <Icon name="checkCircle" className="h-4 w-4" />}
      </button>
      <p className={`min-w-0 flex-1 truncate text-sm ${task.done ? "text-ink/40 line-through" : "font-semibold text-ink"}`}>{task.title}</p>
      {d && !task.done && <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${TONE[d.tone]}`}>{d.text}</span>}
      <button type="button" onClick={() => onRemove(task)} aria-label="Delete task"
        className="flex-shrink-0 rounded-lg p-1.5 text-ink/30 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  );
}
