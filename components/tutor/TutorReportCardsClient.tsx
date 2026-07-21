"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import { fmtWAT } from "@/lib/time";

type Student = { id: string; first_name: string | null; last_name: string | null; student_code: string | null };
type ClassRow = { id: string; subject: string; starts_at: string };
type Card = { id: string; student_id: string; term: string; issued_at: string; serial: string; student_name: string };

// Tutor view of report cards: issue for a roster learner or one of your classes
// (the /api/report-cards route enforces the roster server-side). No revoke —
// that stays admin-only by design.
export default function TutorReportCardsClient({ students, classes, issued }: {
  students: Student[]; classes: ClassRow[]; issued: Card[];
}) {
  const router = useRouter();
  const push = useToast();
  const [mode, setMode] = useState<"student" | "class">("student");
  const [f, setF] = useState({ studentId: "", classId: "", term: "", remark: "" });
  const [busy, setBusy] = useState(false);

  const name = (s: Student) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.student_code || "Student";

  async function issue() {
    if (mode === "student" && !f.studentId) { push("Choose a learner first.", "error"); return; }
    if (mode === "class" && !f.classId) { push("Choose a class first.", "error"); return; }
    if (!f.term.trim()) { push("Enter a term or period.", "error"); return; }
    if (mode === "class" && !confirm("Issue a report card to every active learner in the class?")) return;
    setBusy(true);
    const res = await fetch("/api/report-cards", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "student" ? { studentId: f.studentId } : { classId: f.classId }),
        term: f.term, remark: f.remark,
      }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { push(j.error || "Could not issue the report card.", "error"); return; }
    const n = j.issued ?? 1;
    push(`${n} report card${n === 1 ? "" : "s"} issued — learner${n === 1 ? "" : "s"} notified.`, "success");
    setF({ studentId: "", classId: "", term: f.term, remark: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6 py-2">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="reports" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Report cards</h1>
          <p className="mt-1 text-sm text-white/50">Issue a termly progress report for your learners — they download it as a PDF.</p>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Issue a report card</h2>

        <div className="mb-3 flex flex-wrap gap-2">
          {([["student", "One learner"], ["class", "A whole class"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                mode === id ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60 hover:bg-chalk"}`}>
              <Icon name={id === "class" ? "classes" : "profile"} className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {mode === "student" ? (
              <>
                <label className="flabel">Learner</label>
                <select className="field" value={f.studentId} onChange={e => setF({ ...f, studentId: e.target.value })}>
                  <option value="">Choose a learner…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{name(s)}{s.student_code ? ` · ${s.student_code}` : ""}</option>)}
                </select>
              </>
            ) : (
              <>
                <label className="flabel">Class</label>
                <select className="field" value={f.classId} onChange={e => setF({ ...f, classId: e.target.value })}>
                  <option value="">Choose a class…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.subject} · {fmtWAT(c.starts_at)}</option>)}
                </select>
              </>
            )}
          </div>
          <div>
            <label className="flabel">Term / period</label>
            <input className="field" list="rc-terms" value={f.term}
              onChange={e => setF({ ...f, term: e.target.value })} placeholder="First Term 2025/26" />
            <datalist id="rc-terms">
              <option value="First Term 2025/26" /><option value="Second Term 2025/26" />
              <option value="Third Term 2025/26" /><option value="Summer Camp 2026" />
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="flabel">Remark <span className="text-ink/40">(optional)</span></label>
            <textarea className="field min-h-[80px]" value={f.remark} maxLength={600}
              onChange={e => setF({ ...f, remark: e.target.value })}
              placeholder="A strong term — excellent progress; keep working on timed practice." />
            <p className="mt-1 text-[11px] text-ink/40">Score, attendance, points &amp; conduct are captured automatically from the learner&apos;s current record.</p>
          </div>
        </div>
        <button className="btn-gold mt-4 inline-flex items-center gap-2" onClick={issue} disabled={busy}>
          <Icon name="reports" className="h-4 w-4" /> {busy ? "Issuing…" : "Issue report card"}
        </button>
      </div>

      <div className="card neu-card overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Issued ({issued.length})</h2>
        </div>
        {issued.length ? (
          <div className="divide-y divide-line/60">
            {issued.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-pale text-gold-deep">
                  <Icon name="reports" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{c.student_name}</p>
                  <p className="truncate text-xs text-ink/50">{c.term} · {new Date(c.issued_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
                </div>
                <Link href={`/report-card/${c.id}`} className="flex-shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-chalk">View</Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-ink/40">No report cards issued yet.</p>
        )}
      </div>
    </div>
  );
}
