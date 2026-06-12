import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default async function StudentMaterials() {
  const supa = supabaseServer();
  const [profile, { data: materials }] = await Promise.all([
    getProfile(),
    supa.from("lesson_materials").select("*").order("created_at", { ascending: false }),
  ]);

  const mySubjects = profile?.subjects ?? [];
  const filtered = mySubjects.length
    ? (materials ?? []).filter(m => mySubjects.includes(m.subject))
    : (materials ?? []);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Lesson materials</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(m => (
          <div key={m.id} className="card overflow-hidden">
            <div className="h-1 bg-gold" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold truncate">{m.title}</h2>
                  <p className="text-xs text-ink/45">{m.subject} · {formatSize(m.file_size || 0)}</p>
                  {m.description && <p className="mt-1 text-sm text-ink/55 line-clamp-2">{m.description}</p>}
                </div>
                <span className="pill-blue">PDF</span>
              </div>
              <a href={m.file_url} target="_blank" rel="noopener noreferrer"
                className="btn-gold mt-3 block w-full text-center">📄 Open material</a>
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div className="card p-12 text-center text-ink/40 md:col-span-2">
            No lesson materials available for your subjects yet.
          </div>
        )}
      </div>
    </div>
  );
}
