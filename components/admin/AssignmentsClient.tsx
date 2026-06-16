"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const SUBJECTS = ["Algebra","Calculus","Statistics","Geometry","Further Mathematics","Core Maths Revision","Physics","JavaScript","Python","Python Practice Challenge","External Examinations"];

type CBTQuestion = { id: number; question: string; options: string[]; answer: number };

export default function AssignmentsClient({ initialSubs, initialStudents }: { initialSubs: any[]; initialStudents: any[] }) {
  const supabase = supabaseBrowser();
  const [subs, setSubs] = useState<any[]>(initialSubs);
  const [students] = useState<any[]>(initialStudents);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState<any>({ subject: "Algebra", type: "written", roster: [] as string[], cbt_mode: "link" });
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  async function reload() {
    const { data: s } = await supabase.from("assignment_submissions")
      .select("*, assignment:assignments(*), student:profiles(first_name,last_name,student_code)")
      .order("id", { ascending: false });
    setSubs(s ?? []);
  }

  function addQuestion() {
    setQuestions(prev => [...prev, { id: prev.length + 1, question: "", options: ["", "", "", ""], answer: 0 }]);
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
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) return alert("JSON must be an array of questions.");
      const valid = parsed.every((q: any) => q.question && Array.isArray(q.options) && typeof q.answer === "number");
      if (!valid) return alert("Each question needs: question (string), options (array), answer (number/index).");
      setQuestions(parsed.map((q: any, i: number) => ({ ...q, id: i + 1 })));
      setJsonInput("");
    } catch { alert("Invalid JSON."); }
  }

  async function create() {
    if (!f.title) return alert("Add a title.");
    if (f.type === "cbt" && f.cbt_mode === "link" && !f.cbt_link) return alert("Add the CBT test link.");
    if (f.type === "cbt" && f.cbt_mode === "inline" && questions.length === 0) return alert("Add at least one question.");
    setBusy(true);

    // Upload file if present
    let fileUrl = "", fileName = "";
    if (file) {
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "assignments");
      form.append("folder", f.subject.toLowerCase().replace(/\s+/g, "-"));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setBusy(false); return alert(`Upload failed: ${json.error}`); }
      fileUrl = json.url; fileName = json.name;
    }

    const roster = f.roster.length ? f.roster : students.map(s => s.id);
    const { data: a, error } = await supabase.from("assignments").insert({
      title: f.title, subject: f.subject, type: f.type, instructions: f.instructions || "",
      due_date: f.due_date || null,
      cbt_link: f.cbt_mode === "link" ? (f.cbt_link || "") : "",
      cbt_open: f.cbt_open || null, cbt_close: f.cbt_close || null,
      cbt_questions: f.type === "cbt" && f.cbt_mode === "inline" ? questions : null,
      file_url: fileUrl, file_name: fileName,
    }).select().single();

    if (error || !a) { setBusy(false); return alert("Could not create assignment."); }
    await supabase.from("assignment_submissions")
      .insert(roster.map((sid: string) => ({ assignment_id: a.id, student_id: sid })));

    setBusy(false); setShowForm(false);
    setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" });
    setQuestions([]); setFile(null);
    reload();
  }

  async function grade(sub: any) {
    const g = prompt(`Grade for ${sub.student.first_name} — "${sub.assignment.title}" (0–100):`, sub.grade ?? "");
    if (g === null) return;
    const feedback = prompt("Feedback for the student (optional):", sub.feedback ?? "") ?? "";
    const res = await fetch("/api/assignments/grade", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId: sub.id, grade: Number(g), feedback }),
    });
    if (!res.ok) alert("Grading failed.");
    reload();
  }

  async function saveEdit() {
    if (!f.title) return alert("Add a title.");
    await supabase.from("assignments").update({
      title: f.title, subject: f.subject, due_date: f.due_date || null, instructions: f.instructions || "",
    }).eq("id", editId!);
    setEditId(null); setShowForm(false);
    setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" });
    reload();
  }

  function startEditAssignment(a: any) {
    setEditId(a.id);
    setF({ title: a.title, subject: a.subject, type: a.type, due_date: a.due_date || "",
           instructions: a.instructions || "", roster: [], cbt_mode: "link" });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAssignment(assignmentId: string, title: string, count: number) {
    if (!confirm(`Delete "${title}"? This permanently removes the assignment and all ${count} student submission(s) and grades for it. This cannot be undone.`)) return;
    await supabase.from("assignments").delete().eq("id", assignmentId);
    reload();
  }

  const grouped = subs.reduce((acc: any, s) => {
    (acc[s.assignment.id] ??= { assignment: s.assignment, rows: [] }).rows.push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Assignments</h1>
        <button className="btn-gold" onClick={() => { if (showForm) { setEditId(null); setF({ subject: "Algebra", type: "written", roster: [], cbt_mode: "link" }); } setShowForm(v => !v); }}>{showForm ? "Cancel" : "+ New assignment"}</button>
      </div>

      {showForm && (
        <div className="card space-y-4 p-6">
          {editId && <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900">Editing details only. Questions, files and roster can't be changed after creation — delete and recreate if those need to change.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field sm:col-span-2" placeholder="Title" value={f.title || ""} onChange={e => setF({ ...f, title: e.target.value })} />
            <select className="field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="field" type="date" placeholder="Due date" value={f.due_date || ""} onChange={e => setF({ ...f, due_date: e.target.value })} />
            <select className="field" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
              <option value="written">Written</option><option value="cbt">CBT test</option>
            </select>
            <input className="field" type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

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
                  <input className="field" placeholder="CBT test link (https://…)" value={f.cbt_link || ""} onChange={e => setF({ ...f, cbt_link: e.target.value })} />
                  <input className="field" type="datetime-local" title="Opens" value={f.cbt_open || ""} onChange={e => setF({ ...f, cbt_open: e.target.value })} />
                  <input className="field" type="datetime-local" title="Closes" value={f.cbt_close || ""} onChange={e => setF({ ...f, cbt_close: e.target.value })} />
                </div>
              )}

              {f.cbt_mode === "inline" && (
                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input className="field" type="datetime-local" title="Opens" value={f.cbt_open || ""} onChange={e => setF({ ...f, cbt_open: e.target.value })} />
                    <input className="field" type="datetime-local" title="Closes" value={f.cbt_close || ""} onChange={e => setF({ ...f, cbt_close: e.target.value })} />
                  </div>

                  {/* Question builder */}
                  {questions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border border-line bg-chalk/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-ink/45">Question {qi + 1}</p>
                        <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => removeQuestion(qi)}>Remove</button>
                      </div>
                      <input className="field" placeholder="Question text" value={q.question}
                        onChange={e => updateQuestion(qi, "question", e.target.value)} />
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
                        <textarea className="field min-h-24 font-mono text-xs" placeholder='[{"question":"...","options":["A","B","C","D"],"answer":0}]'
                          value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
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
          <button className="btn-gold" onClick={editId ? saveEdit : create} disabled={busy}>{editId ? "Save changes" : (busy ? "Creating…" : "Create assignment")}</button>
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
              <p className="text-xs text-ink/45">{g.assignment.subject} · due {g.assignment.due_date ?? "TBD"}</p>
            </div>
            <div className="flex items-center gap-3">
              {g.assignment.file_url && (
                <a href={g.assignment.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-bold text-gold-deep hover:underline">View PDF</a>
              )}
              <p className="text-xs font-bold text-ink/45">
                {g.rows.filter((r: any) => r.status !== "pending").length}/{g.rows.length} done
              </p>
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
                </div>
                <div className="flex items-center gap-3">
                  <span className={r.status === "graded" ? "pill-green" : r.status === "submitted" ? "pill-blue" : "pill-amber"}>
                    {r.status}{r.status === "graded" && ` · ${r.grade}/100`}
                  </span>
                  {r.status !== "pending" && (
                    <button className="text-[13px] font-bold text-gold-deep hover:underline" onClick={() => grade(r)}>
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
    </div>
  );
}
