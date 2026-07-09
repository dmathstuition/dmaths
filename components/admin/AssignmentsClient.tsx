"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import CBTPreview from "@/components/admin/CBTPreview";
import ConfirmModal from "@/components/ConfirmModal";
import GradeModal from "@/components/GradeModal";
import { useToast } from "@/components/Toast";
import { fmtWAT, watToUtcISO, utcToWatParts } from "@/lib/time";
import { codeDisplay } from "@/lib/codeSubmission";

const SUBJECTS = ["Algebra","Calculus","Statistics","Geometry","Further Mathematics","Core Maths Revision","Physics","JavaScript","Python","Python Practice Challenge","External Examinations"];

type CBTQuestion = { id: number; question: string; code?: string; options: string[]; answer: number };

type ConfirmState = {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void;
};

const JSON_PLACEHOLDER = `[
  {
    "id": 1,
    "question": "Given the code, how many times will the loop execute?",
    "code": "data = {'students': ['John', 'Mary', 'Peter']}\nfor student in data['students']:\n    print(student)",
    "options": ["1", "2", "3", "4"],
    "correctAnswer": 2
  }
]`;

export default function AssignmentsClient({ initialSubs, initialStudents }: { initialSubs: any[]; initialStudents: any[] }) {
  const supabase = supabaseBrowser();
  const push = useToast();
  const [subs, setSubs] = useState<any[]>(initialSubs);
  const [students] = useState<any[]>(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<any>({ subject: "Algebra", type: "written", roster: [] as string[], cbt_mode: "link" });
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [previewCBT, setPreviewCBT] = useState<any | null>(null);
  const [formError, setFormError] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [gradeTarget, setGradeTarget] = useState<any | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  async function sendReminders() {
    setSendingReminders(true);
    const res = await fetch("/api/reminders/assignments", { method: "POST" });
    const json = await res.json();
    setSendingReminders(false);
    if (!res.ok) { push(json.error || "Failed to send reminders.", "error"); return; }
    push(json.sent > 0 ? `${json.sent} of ${json.total} reminder email(s) sent.` : (json.message ?? "No reminders needed."), "success");
  }

  async function reload() {
    const { data: s } = await supabase.from("assignment_submissions")
      .select("*, assignment:assignments(*), student:profiles(first_name,last_name,student_code)")
      .order("id", { ascending: false });
    setSubs(s ?? []);
  }

  function addQuestion() {
    setQuestions(prev => [...prev, { id: prev.length + 1, question: "", code: "", options: ["", "", "", ""], answer: 0 }]);
  }

  function updateQuestion(idx: number, field: string, value: any) {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  }

  function updateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : q));
  }

  function removeQuestion(idx: number) {
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, id: i + 1 })));
  }

  function importJSON() {
    setJsonError("");
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) { setJsonError("JSON must be an array of questions."); return; }
      const norm = parsed.map((q: any, i: number) => ({
        id: typeof q.id === "number" ? q.id : i + 1,
        question: q.question,
        code: typeof q.code === "string" ? q.code : "",
        options: q.options,
        answer: typeof q.answer === "number" ? q.answer
              : typeof q.correctAnswer === "number" ? q.correctAnswer : -1,
      }));
      const valid = norm.every((q: any) => q.question && Array.isArray(q.options) && q.answer >= 0 && q.answer < q.options.length);
      if (!valid) { setJsonError("Each question needs: question (string), options (array), and answer OR correctAnswer (0-based index of the correct option)."); return; }
      setQuestions(parsed.map((q: any, i: number) => ({ ...q, id: i + 1 })));
      setJsonInput("");
    } catch { setJsonError("Invalid JSON."); }
  }

  async function create() {
    setFormError("");
    if (!f.title) { setFormError("Add a title."); return; }
    if (f.type === "cbt" && f.cbt_mode === "link" && !f.cbt_link) { setFormError("Add the CBT test link."); return; }
    if (f.type === "cbt" && f.cbt_mode === "inline" && questions.length === 0) { setFormError("Add at least one question."); return; }
    setBusy(true);

    let fileUrl = "", fileName = "";
    if (file) {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "assignments");
      form.append("folder", f.subject.toLowerCase().replace(/\s+/g, "-"));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setBusy(false); setFormError(`Upload failed: ${json.error}`); return; }
      fileUrl = json.url; fileName = json.name;
    }

    const roster = f.roster.length ? f.roster : students.map(s => s.id);
    // The typed deadline (date + time) is interpreted as WAT; 23:59 by default.
    const due_at = f.due_date ? watToUtcISO(f.due_date, f.due_time || "23:59") : null;
    const payload: any = {
      title: f.title, subject: f.subject, type: f.type, instructions: f.instructions || "",
      due_date: f.due_date || null, due_at,
      cbt_link: f.cbt_mode === "link" ? (f.cbt_link || "") : "",
      cbt_open: f.cbt_open || null, cbt_close: f.cbt_close || null,
      cbt_questions: f.type === "cbt" && f.cbt_mode === "inline" ? questions : null,
      file_url: fileUrl, file_name: fileName,
      ...(f.type === "code" ? { code_language: f.code_language || "python", starter_code: f.starter_code || "" } : {}),
    };
    let { data: a, error } = await supabase.from("assignments").insert(payload).select().single();
    if (error && /due_at/i.test(error.message)) {
      // Migration not applied yet — create without the deadline time (date-only).
      const { due_at: _omit, ...withoutDueAt } = payload;
      ({ data: a, error } = await supabase.from("assignments").insert(withoutDueAt).select().single());
    }
    if (error && /code_language|starter_code/i.test(error.message)) {
      setBusy(false); setFormError("Coding assignments need migration-code-assignments.sql — run it in Supabase."); return;
    }

    if (error || !a) { setBusy(false); setFormError("Could not create assignment."); return; }
    await supabase.from("assignment_submissions")
      .insert(roster.map((sid: string) => ({ assignment_id: a.id, student_id: sid })));

    setBusy(false); setShowForm(false);
    setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" });
    setQuestions([]); setFile(null);
    reload();
  }

  async function doGrade(sub: any, grade: number, feedback: string) {
    setGradeTarget(null);
    const res = await fetch("/api/assignments/grade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, grade, feedback }),
    });
    if (!res.ok) { push("Grading failed.", "error"); return; }
    push("Grade saved.", "success");
    reload();
  }

  async function saveEdit() {
    setFormError("");
    if (!f.title) { setFormError("Add a title."); return; }
    const due_at = f.due_date ? watToUtcISO(f.due_date, f.due_time || "23:59") : null;
    const payload: any = {
      title: f.title, subject: f.subject, due_date: f.due_date || null, due_at,
      instructions: f.instructions || "",
    };
    let { error } = await supabase.from("assignments").update(payload).eq("id", editId!);
    if (error && /due_at/i.test(error.message)) {
      const { due_at: _omit, ...withoutDueAt } = payload;
      ({ error } = await supabase.from("assignments").update(withoutDueAt).eq("id", editId!));
    }
    setEditId(null); setShowForm(false);
    setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" });
    reload();
  }

  function startEditAssignment(a: any) {
    // Show the stored deadline back as WAT date + time (23:59 for legacy date-only).
    const parts = a.due_at ? utcToWatParts(a.due_at) : { date: a.due_date || "", time: "23:59" };
    setEditId(a.id);
    setF({ title: a.title, subject: a.subject, type: a.type,
           due_date: parts.date, due_time: parts.time,
           code_language: a.code_language || "python", starter_code: a.starter_code || "",
           instructions: a.instructions || "", roster: [], cbt_mode: "link" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteAssignment(assignmentId: string, title: string, count: number) {
    setConfirmState({
      title: `Delete "${title}"?`,
      message: `This removes the assignment and its ${count} submission(s). Students keep their recorded average. This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        await supabase.from("assignments").delete().eq("id", assignmentId);
        reload();
      },
    });
  }

  const grouped = subs.reduce((acc: any, s) => {
    (acc[s.assignment.id] ??= { assignment: s.assignment, rows: [] }).rows.push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Assignments</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={sendReminders} disabled={sendingReminders}>
            {sendingReminders ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" /> : "Send due-tomorrow reminders"}
          </button>
          <button className="btn-gold" onClick={() => { if (showForm) { setEditId(null); setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" }); } setShowForm(v => !v); }}>{showForm ? "Cancel" : "+ New assignment"}</button>
        </div>
      </div>

      {showForm && (
        <div className="card space-y-4 p-6">
          {editId && <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900">Editing details only. Questions, files and roster can't be changed after creation — delete and recreate if those need to change.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="flabel">Assignment title</label>
              <input className="field" placeholder="e.g. Week 3 — Loops & Lists practice" value={f.title || ""} onChange={e => setF({ ...f, title: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Subject</label>
              <select className="field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">Due date <span className="font-normal text-ink/40">(when students must submit by)</span></label>
              <input className="field" type="date" value={f.due_date || ""} onChange={e => setF({ ...f, due_date: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Deadline time <span className="font-normal text-ink/40">(WAT — submissions close then)</span></label>
              <input className="field" type="time" value={f.due_time || "23:59"} onChange={e => setF({ ...f, due_time: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Type</label>
              <select className="field" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
                <option value="written">Written (photo / link submission)</option>
                <option value="cbt">CBT test (multiple choice)</option>
                <option value="code">Code (in-browser IDE)</option>
              </select>
            </div>
            {f.type === "code" && (
              <div>
                <label className="flabel">Language</label>
                <select className="field" value={f.code_language || "python"} onChange={e => setF({ ...f, code_language: e.target.value })}>
                  <option value="python">Python</option>
                  <option value="web">Web (HTML/CSS/JS)</option>
                </select>
              </div>
            )}
            <div>
              <label className="flabel">Attach question sheet <span className="font-normal text-ink/40">(optional)</span></label>
              <input className="field" type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          {f.type === "code" && (
            <div>
              <label className="flabel">Starter code <span className="font-normal text-ink/40">(optional — what the learner opens with)</span></label>
              <textarea className="field min-h-[120px] font-mono text-[13px]" spellCheck={false}
                value={f.starter_code || ""} onChange={e => setF({ ...f, starter_code: e.target.value })}
                placeholder={f.code_language === "web" ? 'Leave blank, or paste {"html":"…","css":"…","js":"…"}' : "# starter code the learner sees…"} />
            </div>
          )}

          {f.type === "cbt" && (
            <>
              <div className="flex gap-2">
                <button onClick={() => setF({ ...f, cbt_mode: "link" })}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${f.cbt_mode === "link" ? "bg-ink text-white" : "bg-white border border-line text-ink/60"}`}>
                  External link
                </button>
                <button onClick={() => setF({ ...f, cbt_mode: "inline" })}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${f.cbt_mode === "inline" ? "bg-ink text-white" : "bg-white border border-line text-ink/60"}`}>
                  Built-in questions
                </button>
              </div>

              {f.cbt_mode === "link" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <label className="flabel">CBT test link</label>
                    <input className="field" placeholder="https://… (where the test is hosted)" value={f.cbt_link || ""} onChange={e => setF({ ...f, cbt_link: e.target.value })} />
                  </div>
                  <div>
                    <label className="flabel">Test opens <span className="font-normal text-ink/40">(date & time)</span></label>
                    <input className="field" type="datetime-local" value={f.cbt_open || ""} onChange={e => setF({ ...f, cbt_open: e.target.value })} />
                  </div>
                  <div>
                    <label className="flabel">Test closes <span className="font-normal text-ink/40">(date & time)</span></label>
                    <input className="field" type="datetime-local" value={f.cbt_close || ""} onChange={e => setF({ ...f, cbt_close: e.target.value })} />
                  </div>
                </div>
              )}

              {f.cbt_mode === "inline" && (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="flabel">Test opens <span className="font-normal text-ink/40">(date & time)</span></label>
                      <input className="field" type="datetime-local" value={f.cbt_open || ""} onChange={e => setF({ ...f, cbt_open: e.target.value })} />
                    </div>
                    <div>
                      <label className="flabel">Test closes <span className="font-normal text-ink/40">(date & time)</span></label>
                      <input className="field" type="datetime-local" value={f.cbt_close || ""} onChange={e => setF({ ...f, cbt_close: e.target.value })} />
                    </div>
                  </div>

                  {questions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border border-line bg-chalk/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-ink/45">Question {qi + 1}</p>
                        <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => removeQuestion(qi)}>Remove</button>
                      </div>
                      <input className="field" placeholder="Question text — e.g. How many times will the loop run?" value={q.question}
                        onChange={e => updateQuestion(qi, "question", e.target.value)} />
                      <textarea className="field min-h-16 font-mono text-xs" placeholder="Optional code block (shown to students in a monospace box)"
                        value={q.code || ""} onChange={e => updateQuestion(qi, "code", e.target.value)} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input type="radio" name={`answer-${qi}`} checked={q.answer === oi}
                              onChange={() => updateQuestion(qi, "answer", oi)} className="accent-gold" />
                            <input className="field flex-1" placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt}
                              onChange={e => updateOption(qi, oi, e.target.value)} />
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-ink/40">Select the radio button next to the correct answer</p>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <button className="btn-ghost" onClick={addQuestion}>+ Add question</button>
                    <details className="flex-1">
                      <summary className="cursor-pointer text-sm font-bold text-gold-deep hover:underline">Import JSON</summary>
                      <div className="mt-2 space-y-2">
                        <textarea className="field min-h-32 font-mono text-xs" placeholder={JSON_PLACEHOLDER}
                          value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
                        <p className="text-[11px] text-ink/45">Supports <code>answer</code> or <code>correctAnswer</code> (0-based index), and an optional <code>code</code> block.</p>
                        {jsonError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">{jsonError}</p>}
                        <button className="btn-ghost" onClick={importJSON}>Parse & import</button>
                      </div>
                    </details>
                  </div>
                  {questions.length > 0 && <p className="text-sm font-semibold text-ink/45">{questions.length} question{questions.length !== 1 ? "s" : ""} ready</p>}
                </div>
              )}
            </>
          )}

          <textarea className="field min-h-20" placeholder="Instructions for students…" value={f.instructions || ""} onChange={e => setF({ ...f, instructions: e.target.value })} />
          <div>
            <p className="flabel">Assign to students <span className="font-normal text-ink/40">(none = everyone)</span></p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {students.map(s => {
                const on = f.roster.includes(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={() => setF({ ...f, roster: on ? f.roster.filter((x: string) => x !== s.id) : [...f.roster, s.id] })}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-gold bg-gold-pale text-gold-deep" : "border-line bg-white text-ink/60"}`}>
                    {s.first_name} {s.last_name}
                  </button>
                );
              })}
            </div>
          </div>
          {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{formError}</p>}
          <button className="btn-gold" onClick={editId ? saveEdit : create} disabled={busy}>
            {busy
              ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : editId ? "Save changes" : "Create assignment"}
          </button>
        </div>
      )}

      {Object.values(grouped).map((g: any) => (
        <div key={g.assignment.id} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-4">
            <div>
              <h2 className="font-extrabold">
                {g.assignment.title}
                {g.assignment.type === "cbt" && <span className="pill-blue ml-1">CBT</span>}
                {g.assignment.cbt_questions?.length > 0 && <span className="pill ml-1 bg-purple-100 text-purple-800">Inline</span>}
                {g.assignment.file_url && <span className="pill ml-1 bg-cyan-100 text-cyan-800">PDF</span>}
              </h2>
              <p className="text-xs text-ink/45">
                {g.assignment.subject} · due {g.assignment.due_at ? `${fmtWAT(g.assignment.due_at)} WAT` : (g.assignment.due_date ?? "TBD")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {g.assignment.file_url && (
                <a href={g.assignment.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-gold-deep hover:underline">View PDF</a>
              )}
              <p className="text-xs font-bold text-ink/45">
                {g.rows.filter((r: any) => r.status !== "pending").length}/{g.rows.length} done
              </p>
              {g.assignment.type === "cbt" && g.assignment.cbt_questions?.length > 0 && (
                <button className="text-xs font-bold text-gold-deep hover:underline"
                  onClick={() => setPreviewCBT(g.assignment)}>Preview / test</button>
              )}
              <button className="text-xs font-bold text-ink/60 hover:underline"
                onClick={() => startEditAssignment(g.assignment)}>Edit</button>
              <button className="text-xs font-bold text-red-600 hover:underline"
                onClick={() => deleteAssignment(g.assignment.id, g.assignment.title, g.rows.length)}>Delete</button>
            </div>
          </div>
          <div className="divide-y divide-line/60">
            {g.rows.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                <div>
                  <p className="font-bold">{r.student.first_name} {r.student.last_name}
                    <span className="ml-2 font-mono text-xs text-ink/40">{r.student.student_code}</span></p>
                  <div className="flex flex-wrap gap-3">
                    {r.submission_link && (
                      <a href={r.submission_link} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-gold-deep hover:underline">View submitted link →</a>
                    )}
                    {r.file_url && (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-semibold text-gold-deep hover:underline">View submitted photo / file →</a>
                    )}
                  </div>
                  {r.code && g.assignment.type === "code" && (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-semibold text-gold-deep">View submitted {g.assignment.code_language === "web" ? "web" : "Python"} code</summary>
                      <pre className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0b2036] p-3 font-mono text-[12px] text-slate-100">{codeDisplay(r.code, g.assignment.code_language)}</pre>
                    </details>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={r.status === "graded" ? "pill-green" : r.status === "submitted" ? "pill-blue" : "pill-amber"}>
                    {r.status}{r.status === "graded" && ` · ${r.grade}/100`}
                  </span>
                  {r.status !== "pending" && (
                    <button className="text-[13px] font-bold text-gold-deep hover:underline" onClick={() => setGradeTarget(r)}>
                      {r.status === "graded" ? "Update grade" : "Grade"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!subs.length && <div className="card p-12 text-center text-ink/40">No assignments yet.</div>}

      {previewCBT && (
        <CBTPreview
          title={previewCBT.title}
          questions={previewCBT.cbt_questions || []}
          onClose={() => setPreviewCBT(null)}
        />
      )}

      {gradeTarget && (
        <GradeModal
          studentName={`${gradeTarget.student.first_name} ${gradeTarget.student.last_name}`}
          assignmentTitle={gradeTarget.assignment.title}
          initialGrade={gradeTarget.grade ?? null}
          initialFeedback={gradeTarget.feedback ?? ""}
          onConfirm={(grade, feedback) => doGrade(gradeTarget, grade, feedback)}
          onCancel={() => setGradeTarget(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal {...confirmState} onCancel={() => setConfirmState(null)} />
      )}
    </div>
  );
}
