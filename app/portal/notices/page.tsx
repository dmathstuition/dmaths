import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentNotices() {
  const supa = supabaseServer();
  const [me, { data: notices }] = await Promise.all([
    getProfile(),
    supa.from("notices").select("*").order("created_at", { ascending: false }),
  ]);
  const mine = (notices ?? []).filter(n => n.target === "all" || (me?.subjects ?? []).includes(n.target));

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Notices</h1>
      {mine.map(n => (
        <article key={n.id} className="card border-l-4 border-l-gold p-6">
          <h2 className="font-extrabold">{n.title}</h2>
          <p className="text-xs text-ink/40">
            {new Date(n.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })} · {n.target === "all" ? "All students" : n.target}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink/65">{n.body}</p>
        </article>
      ))}
      {!mine.length && <div className="card p-12 text-center text-ink/40">No notices yet.</div>}
    </div>
  );
}
