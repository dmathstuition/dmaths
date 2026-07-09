"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { watToUtcISO } from "@/lib/time";
import { codeDisplay } from "@/lib/codeSubmission";

export default function TutorAssignmentsClient({ students, initialSubs }: { students: any[]; initialSubs: any[] }) {
  const router = useRouter();
  const push = useToast();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>({ subject: "Mathematics", type: "written", roster: [] as string[] });
  const [file, setFile] = useState<File | null>(null);
  const [gradeFor, setGradeFor] = useState<string | null>(null);
  const [gradeVal, setGradeVal] = useState("");
  const [feedback, setFeedback] = useState("");

  async function create() {
    if (!f.title?.trim()) { push("Add a title.", "error"); return; }
    if (!f.roster.length) { push("Pick at least one learner.", "error"); return; }
    setBusy(true);

    let fileUrl = "", fileName = "";
    if (file) {
      const form = new FormData();
      form.append("file", file); form.append("bucket", "assignments");
      form.append("folder", String(f.subject).toLowerCase().replace(/\s+/g, "-"));
      const up = await fetch("/api/upload", { method: "POST", body: form });
      const uj = await up.json();
      if (!up.ok) { setBusy(false); push(`Upload failed: ${uj.error}`, "error"); return; }
      fileUrl = uj.url; fileName = uj.name;
    }

    const dueAt = f.due_date ? watToUtcISO(f.due_date, f.due_time || "23:59") : null;
    const res = await fetch("/api/tutors/assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title, subject: f.subject, type: f.type,
        instructions: f.instructions || "", cbtLink: f.cbt_link || "",
        codeLanguage: f.code_language || "python", starterCode: f.starter_code || "",
        dueDate: f.due_date || null, dueAt,
        fileUrl, fileName,
        studentIds: f.roster,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { push(json.error || "Could not create assignment.", "error"); return; }
    push(`Assignment sent to ${json.count} learner${json.count === 1 ? "" : "s"}.`, "success");
    setShowForm(false);
    setF({ subject: "Mathematics", type: "written", roster: [] });
    setFile(null);
    router.refresh();
  }

  async function grade(sub: any) {
    const g = Number(gradeVal);
    if (!Number.isFinite(g) || g < 0 || g > 100) { push("Grade must be 0–100.", "error"); return; }
    setBusy(true);
    const res = await fetch("/api/assignments/grade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, grade: g, feedback }),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); push(j.error || "Could not grade.", "error"); return; }
    push("Graded — the learner has been notified.", "success");
    setGradeFor(null); setGradeVal(""); setFeedback("");
    router.refresh();
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-ink/50">Set work for your learners and grade what they submit.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowForm((v) => !v)} disabled={!students.length}>
          {showForm ? "Cancel" : "+ New assignment"}
        </button>
      </div>

      {!students.length && (
        <div className="card p-8 text-center text-sm text-ink/45">
          You have no learners yet. Once the admin assigns you a class or learner, you can set assignments here.
        </div>
      )}

      {showForm && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field" placeholder="Title" value={f.title || ""} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <input className="field" placeholder="Subject" value={f.subject || ""} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="written">Written</option>
              <option value="cbt">CBT (link)</option>
              <option value="code">Code (in-browser IDE)</option>
            </select>
            {f.type === "cbt" && (
              <input className="field" placeholder="CBT link (https://…)" value={f.cbt_link || ""} onChange={(e) => setF({ ...f, cbt_link: e.target.value })} />
            )}
            {f.type === "code" && (
              <select className="field" value={f.code_language || "python"} onChange={(e) => setF({ ...f, code_language: e.target.value })}>
                <option value="python">Python</option>
                <option value="web">Web (HTML/CSS/JS)</option>
              </select>
            )}
            <input className="field" type="date" value={f.due_date || ""} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
            <input className="field" type="time" value={f.due_time || ""} onChange={(e) => setF({ ...f, due_time: e.target.value })} title="Deadline time (WAT)" />
          </div>
          {f.type === "code" && (
            <div>
              <label className="flabel">Starter code (optional — what the learner sees to begin)</label>
              <textarea className="field min-h-[120px] font-mono text-[13px]" spellCheck={false}
                placeholder={f.code_language === "web" ? '{"html":"…","css":"…","js":"…"} or just leave blank' : "# starter code…"}
                value={f.starter_code || ""} onChange={(e) => setF({ ...f, starter_code: e.target.value })} />
            </div>
          )}
          <textarea className="field min-h-[80px]" placeholder="Instructions (optional)"
            value={f.instructions || ""} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
          <div>
            <label className="flabel">Attachment (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink/60 file:mr-3 file:rounded-lg file:border-0 file:bg-chalk file:px-3 file:py-2 file:text-sm file:font-semibold" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flabel mb-0">Assign to</p>
              <div className="flex gap-3">
                <button type="button" className="text-xs font-bold text-gold-deep hover:underline"
                  onClick={() => setF({ ...f, roster: students.map((s) => s.id) })}>Select all</button>
                <button type="button" className="text-xs font-bold text-ink/40 hover:underline"
                  onClick={() => setF({ ...f, roster: [] })}>Clear</button>
              </div>
            </div>
            <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
              {students.map((s) => {
                const on = f.roster.includes(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={() => setF({ ...f, roster: on ? f.roster.filter((x: string) => x !== s.id) : [...f.roster, s.id] })}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60"}`}>
                    {s.first_name} {s.last_name} · {s.level}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn-gold" onClick={create} disabled={busy}>{busy ? "Sending…" : "Create & send"}</button>
        </div>
      )}

      {/* Submissions */}
      <div className="space-y-2">
        {initialSubs.length === 0 && students.length > 0 && (
          <div className="card p-8 text-center text-sm text-ink/45">No assignments yet — create one above.</div>
        )}
        {initialSubs.map((sub) => (
          <div key={sub.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{sub.assignment?.title ?? "Assignment"}
                  <span className="ml-2 font-normal text-ink/45">{sub.assignment?.subject}</span>
                </p>
                <p className="text-xs text-ink/45">
                  {sub.student?.first_name} {sub.student?.last_name}
                  {" · "}
                  {sub.status === "graded" ? <span className="font-bold text-emerald-600">{sub.grade}/100</span>
                    : sub.status === "submitted" ? <span className="font-bold text-gold-deep">Submitted</span>
                    : <span className="text-ink/40">Pending</span>}
                </p>
              </div>
              {sub.status !== "graded" && (
                <button className="btn-ghost !min-h-[36px] !px-3 !text-sm"
                  onClick={() => { setGradeFor(gradeFor === sub.id ? null : sub.id); setGradeVal(""); setFeedback(sub.feedback || ""); }}>
                  {gradeFor === sub.id ? "Close" : "Grade"}
                </button>
              )}
            </div>
            {sub.code && sub.assignment?.type === "code" && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-gold-deep">View submitted {sub.assignment?.code_language === "web" ? "web" : "Python"} code</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0b2036] p-3 font-mono text-[12px] text-slate-100">{codeDisplay(sub.code, sub.assignment?.code_language)}</pre>
              </details>
            )}
            {gradeFor === sub.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <input className="field w-24" type="number" min={0} max={100} placeholder="/100"
                  value={gradeVal} onChange={(e) => setGradeVal(e.target.value)} />
                <input className="field min-w-0 flex-1" placeholder="Feedback (optional)"
                  value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                <button className="btn-gold !min-h-[40px] !px-4 !text-sm" disabled={busy} onClick={() => grade(sub)}>Save grade</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
