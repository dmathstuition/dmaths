"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const SUBJECTS = ["Algebra","Calculus","Statistics","Geometry","Further Mathematics","Core Maths Revision","Physics","JavaScript","Python","Python Practice Challenge","External Examinations"];
const LEVELS = ["JSS 1","JSS 2","JSS 3","SS 1","SS 2","SS 3"];

export default function CurriculumClient({ initial }: { initial: any[] }) {
  const supabase = supabaseBrowser();
  const [items, setItems] = useState<any[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ title: "", subject: SUBJECTS[0], level: LEVELS[0], term: "First Term", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function reload() {
    const { data } = await supabase.from("curricula").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  async function upload() {
    if (!f.title || !file) return setMsg("Add a title and select a file.");
    setBusy(true); setMsg("");
    const form = new FormData();
    form.append("file", file);
    form.append("bucket", "curricula");
    form.append("folder", `${f.subject.toLowerCase().replace(/\s+/g, "-")}/${f.level.toLowerCase().replace(/\s+/g, "-")}`);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) { setBusy(false); return setMsg(`Upload failed: ${json.error}`); }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("curricula").insert({
      title: f.title, subject: f.subject, level: f.level, term: f.term,
      description: f.description, file_url: json.url, file_name: json.name, uploaded_by: user?.id,
    });
    setBusy(false); setShowForm(false);
    setF({ title: "", subject: SUBJECTS[0], level: LEVELS[0], term: "First Term", description: "" });
    setFile(null); setMsg("Curriculum uploaded."); reload();
  }

  async function remove(id: string) {
    if (!confirm("Delete this curriculum document?")) return;
    await supabase.from("curricula").delete().eq("id", id);
    reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Curriculum & scheme of work</h1>
          <p className="text-sm text-ink/45">{items.length} documents</p>
        </div>
        <button className="btn-gold" onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : "+ Upload"}</button>
      </div>
      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{msg}</p>}
      {showForm && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="field sm:col-span-2" placeholder="Title (e.g. SS2 Further Mathematics — Second Term)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
            <select className="field" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}>
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select className="field" value={f.level} onChange={e => setF({ ...f, level: e.target.value })}>
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
            <select className="field" value={f.term} onChange={e => setF({ ...f, term: e.target.value })}>
              <option>First Term</option><option>Second Term</option><option>Third Term</option>
            </select>
            <input className="field" type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>
          <textarea className="field min-h-16" placeholder="Description (optional)" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <button className="btn-gold" onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Upload curriculum"}</button>
        </div>
      )}
      {items.map(c => (
        <div key={c.id} className="card border-l-4 border-l-gold p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">{c.title}</h2>
              <p className="text-xs text-ink/45">{c.subject} · {c.level} · {c.term} · {new Date(c.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
              {c.description && <p className="mt-1 text-sm text-ink/55">{c.description}</p>}
            </div>
            <div className="flex gap-2">
              <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[34px]">View</a>
              <button className="text-sm font-bold text-red-600 hover:underline" onClick={() => remove(c.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
      {!items.length && <div className="card p-12 text-center text-ink/40">No curriculum documents uploaded yet.</div>}
    </div>
  );
}
