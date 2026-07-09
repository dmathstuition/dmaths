"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

export default function TutorMaterialsClient({ initial }: { initial: any[] }) {
  const push = useToast();
  const [materials, setMaterials] = useState<any[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ title: "", subject: "Mathematics", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!f.title.trim() || !file) { push("Add a title and choose a file.", "error"); return; }
    setBusy(true);

    const form = new FormData();
    form.append("file", file); form.append("bucket", "materials");
    form.append("folder", f.subject.toLowerCase().replace(/\s+/g, "-"));
    const up = await fetch("/api/upload", { method: "POST", body: form });
    const uj = await up.json();
    if (!up.ok) { setBusy(false); push(`Upload failed: ${uj.error}`, "error"); return; }

    const res = await fetch("/api/tutors/materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.title, subject: f.subject, description: f.description,
        fileUrl: uj.url, fileName: uj.name, fileSize: uj.size,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { push(json.error || "Could not post material.", "error"); return; }
    setMaterials((prev) => [json.material, ...prev]);
    setShowForm(false);
    setF({ title: "", subject: "Mathematics", description: "" });
    setFile(null);
    push("Material posted — your learners can see it now.", "success");
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this material?")) return;
    const prev = materials;
    setMaterials((m) => m.filter((x) => x.id !== id));
    const res = await fetch("/api/tutors/materials", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { setMaterials(prev); push("Could not delete.", "error"); }
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Learning materials</h1>
          <p className="text-sm text-ink/50">Post notes and resources for your learners.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Post material"}</button>
      </div>

      {showForm && (
        <div className="card space-y-3 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <input className="field" placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          </div>
          <textarea className="field min-h-[70px]" placeholder="Description (optional)"
            value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink/60 file:mr-3 file:rounded-lg file:border-0 file:bg-chalk file:px-3 file:py-2 file:text-sm file:font-semibold" />
          <button className="btn-gold" onClick={upload} disabled={busy}>{busy ? "Uploading…" : "Post material"}</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {materials.length === 0 && <div className="card p-8 text-center text-sm text-ink/45 sm:col-span-2">No materials posted yet.</div>}
        {materials.map((m) => (
          <div key={m.id} className="card flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-bold">{m.title}</p>
              <p className="text-xs text-ink/45">{m.subject}</p>
              {m.description && <p className="mt-1 line-clamp-2 text-sm text-ink/55">{m.description}</p>}
              <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-gold-deep hover:underline">Open file →</a>
            </div>
            <button onClick={() => remove(m.id)} className="shrink-0 text-xs font-bold text-red-600 hover:underline">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
