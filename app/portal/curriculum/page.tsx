import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentCurriculum() {
  const supa = supabaseServer();
  const [profile, { data: curricula }] = await Promise.all([
    getProfile(),
    supa.from("curricula").select("*").order("created_at", { ascending: false }),
  ]);

  const mySubjects = profile?.subjects ?? [];
  const myLevel = profile?.level ?? "";
  const filtered = (curricula ?? []).filter(c =>
    (mySubjects.length === 0 || mySubjects.includes(c.subject)) &&
    (!myLevel || c.level === myLevel)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Curriculum</h1>
        <p className="text-sm text-ink/45">Scheme of work for your subjects</p>
      </div>
      {filtered.map(c => (
        <div key={c.id} className="card border-l-4 border-l-gold p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-extrabold">{c.title}</h2>
              <p className="text-xs text-ink/45">{c.subject} · {c.level} · {c.term}</p>
              {c.description && <p className="mt-1 text-sm text-ink/55">{c.description}</p>}
            </div>
            <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="btn-gold !min-h-[36px]">View</a>
          </div>
        </div>
      ))}
      {!filtered.length && (
        <div className="card p-12 text-center text-ink/40">
          No curriculum documents available for your level and subjects yet.
        </div>
      )}
    </div>
  );
}
