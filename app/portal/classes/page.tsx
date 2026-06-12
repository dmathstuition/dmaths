import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyClasses() {
  const supa = supabaseServer();
  // RLS already limits this to classes the student is assigned to
  const { data: classes } = await supa.from("classes").select("*").order("starts_at");

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">My classes</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {(classes ?? []).map(c => (
          <div key={c.id} className="card overflow-hidden">
            <div className="h-1 bg-gold" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">{c.subject}</h2>
                  <p className="text-sm text-ink/50">with {c.tutor}</p>
                </div>
                <span className="pill-blue">{c.platform}</span>
              </div>
              <p className="mt-3 text-sm text-ink/65">
                {new Date(c.starts_at).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" })} · {c.duration_minutes} min
              </p>
              {c.link
                ? <a href={c.link} target="_blank" rel="noopener noreferrer" className="btn-gold mt-4 w-full">Join class</a>
                : <p className="mt-4 rounded-xl bg-chalk px-4 py-2.5 text-center text-sm font-semibold text-ink/45">Class link coming soon</p>}
            </div>
          </div>
        ))}
        {!classes?.length && (
          <div className="card p-12 text-center text-ink/40 md:col-span-2">
            No classes yet — they appear here once your tutor assigns you.
          </div>
        )}
      </div>
    </div>
  );
}
