"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import EmptyState from "@/components/ui/EmptyState";

const ALL = "all";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function StudentMaterialsClient({ materials, subjects }: {
  materials: any[];
  subjects: string[];
}) {
  const [q, setQ] = useState("");
  const [subjectFilter, setSubjectFilter] = useState(ALL);

  const visible = materials.filter(m =>
    (!q || m.title.toLowerCase().includes(q.toLowerCase()) || (m.description ?? "").toLowerCase().includes(q.toLowerCase())) &&
    (subjectFilter === ALL || m.subject === subjectFilter)
  );

  // Unique subjects present in materials (only those the student is enrolled in)
  const availableSubjects = [...new Set(materials.map(m => m.subject))].sort();

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Lesson materials</h1>

      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" placeholder="Search materials…" value={q} onChange={e => setQ(e.target.value)} />
        {availableSubjects.length > 1 && (
          <select className="field max-w-[200px]" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
            <option value={ALL}>All subjects</option>
            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map(m => (
          <div key={m.id} className="card p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gold-pale text-gold-deep">
                <Icon name="materials" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate font-extrabold">{m.title}</h2>
                  <span className="pill-blue flex-shrink-0">PDF</span>
                </div>
                <p className="text-xs text-ink/45">{m.subject} · {formatSize(m.file_size || 0)}</p>
                {m.description && <p className="mt-1 text-sm text-ink/55 line-clamp-2">{m.description}</p>}
              </div>
            </div>
            <a href={m.file_url} target="_blank" rel="noopener noreferrer"
              className="btn-gold mt-3 block w-full text-center">Open material</a>
          </div>
        ))}
        {materials.length > 0 && !visible.length && (
          <div className="md:col-span-2">
            <EmptyState icon="search" title="No materials match your search" body="Try a different keyword or subject." />
          </div>
        )}
        {!materials.length && (
          <div className="md:col-span-2">
            <EmptyState icon="materials" title="No materials yet"
              body="Lesson notes, slides and resources your tutor shares will appear here for your subjects." />
          </div>
        )}
      </div>
    </div>
  );
}
