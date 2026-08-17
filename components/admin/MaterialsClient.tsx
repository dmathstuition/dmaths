"use client";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ACADEMY_SUBJECTS, isAcademySubject } from "@/lib/subjects";
import { useBulkSelect } from "@/lib/useBulkSelect";
import BulkBar from "@/components/admin/BulkBar";

const SUBJECTS: string[] = [...ACADEMY_SUBJECTS];

export default function MaterialsClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const [materials, setMaterials] = useState<any[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ title: "", subject: SUBJECTS[0], description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const sel = useBulkSelect();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [retagOpen, setRetagOpen] = useState(false);
  const [retagSubject, setRetagSubject] = useState(SUBJECTS[0]);

  const filterSubjects = useMemo(() => {
    const present = new Set<string>(materials.map((m) => m.subject).filter(Boolean));
    const legacy = [...present].filter((s) => !isAcademySubject(s)).sort();
    return [...ACADEMY_SUBJECTS, ...legacy];
  }, [materials]);

  async function reload() {
    const { data } = await supabase.from("lesson_materials").select("*").order("created_at", { ascending: false });
    setMaterials(data ?? []);
  }

  async function bulkDelete() {
    const ids = sel.list;
    if (!ids.length || !confirm(`Delete ${ids.length} material${ids.length === 1 ? "" : "s"} permanently?`)) return;
    setBulkBusy(true);
    await supabase.from("lesson_materials").delete().in("id", ids);
    setBulkBusy(false);
    sel.clear();
    reload();
  }

  async function bulkRetag() {
    const ids = sel.list;
    if (!ids.length) return;
    setBulkBusy(true);
    await supabase.from("lesson_materials").update({ subject: retagSubject }).in("id", ids);
    setBulkBusy(false);
    setRetagOpen(false); sel.clear();
    reload();
  }

  async function upload() {
    if (!f.title || !file) return setMsg("Add a title and select a file.");
    setBusy(true); setMsg("");

    const form = new FormData();
    form.append("file", file);
    form.append("bucket", "materials");
    form.append("folder", f.subject.toLowerCase().replace(/\s+/g, "-"));

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return setMsg(`Upload failed: ${json.error}`); }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("lesson_materials").insert({
      title: f.title,
      subject: f.subject,
      description: f.description,
      file_url: json.url,
      file_name: json.name,
      file_size: json.size,
      uploaded_by: user?.id,
    });

    setBusy(false);
    setShowForm(false);
    setF({ title: "", subject: SUBJECTS[0], description: "" });
    setFile(null);
    setMsg("Material uploaded successfully.");
    reload();
  }

  const visible = materials.filter(m =>
    (!q || m.title.toLowerCase().includes(q.toLowerCase()) || (m.description ?? "").toLowerCase().includes(q.toLowerCase())) &&
    (subjectFilter === "all" || m.subject === subjectFilter)
  );

  async function remove(id: string) {
    if (!confirm("Delete this material permanently?")) return;
    await supabase.from("lesson_materials").delete().eq("id", id);
    reload();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Lesson materials</h1>
              <p className="text-sm text-ink/45">{materials.length} files uploaded</p>
        </div>
        <button className="btn-gold" onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : "+ Upload material"}</button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Search title or description…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="field max-w-[200px]" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
          <option value="all">All subjects</option>
          {filterSubjects.map(s => <option key={s} value={s}>{isAcademySubject(s) ? s : `${s} (former)`}</option>)}
        </select>
      </div>

      <BulkBar count={sel.size} noun="material" onClear={sel.clear}>
        <button onClick={bulkDelete} disabled={bulkBusy}
          className="btn border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50">Delete selected</button>
        <button onClick={() => setRetagOpen(s => !s)} disabled={bulkBusy}
          className="btn border border-line bg-white text-ink/70 hover:bg-chalk disabled:opacity-50">Change subject</button>
      </BulkBar>

      {retagOpen && sel.size > 0 && (
        <div className="card flex flex-wrap items-end gap-3 border-gold/40 p-4">
          <div>
            <label htmlFor="mat-retag" className="flabel">New subject for {sel.size} selected</label>
            <select id="mat-retag" className="field" value={retagSubject} onChange={e => setRetagSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={bulkRetag} disabled={bulkBusy} className="btn-gold">{bulkBusy ? "Applying…" : "Apply"}</button>
          <button onClick={() => setRetagOpen(false)} className="btn-ghost">Cancel</button>
        </div>
      )}

      {visible.length > 0 && (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-ink/70">
          <input type="checkbox" className="h-4 w-4"
            checked={sel.allSelected(visible.map(m => m.id))}
            onChange={e => e.target.checked ? sel.selectOnly(visible.map(m => m.id)) : sel.clear()} />
          Select all {visible.length} shown
        </label>
      )}

      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{msg}</p>}

      {showForm && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field sm:col-span-2" placeholder="Title (e.g. Trigonometry Notes — Week 3)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
            <select className="field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="field" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.png" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <textarea className="field min-h-16" placeholder="Description (optional)" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <button className="btn-gold" onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map(m => (
          <div key={m.id} className={`card p-5 ${sel.has(m.id) ? "ring-2 ring-gold" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 flex-shrink-0" aria-label="Select this material"
                checked={sel.has(m.id)} onChange={() => sel.toggle(m.id)} />
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold truncate">{m.title}</h2>
                <p className="text-xs text-ink/45">{m.subject} · {formatSize(m.file_size || 0)} · {new Date(m.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
                {m.description && <p className="mt-1 text-sm text-ink/55 line-clamp-2">{m.description}</p>}
              </div>
              <span className="pill-blue">PDF</span>
            </div>
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="btn-ghost flex-1 text-center !min-h-[36px]">View</a>
              <button className="text-sm font-bold text-red-600 hover:underline px-3" onClick={() => remove(m.id)}>Delete</button>
            </div>
          </div>
        ))}
        {materials.length > 0 && !visible.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No materials match your search.</div>}
        {!materials.length && <div className="card p-12 text-center text-ink/40 md:col-span-2">No materials uploaded yet.</div>}
      </div>
    </div>
  );
}
