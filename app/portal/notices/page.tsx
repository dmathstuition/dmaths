import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentNotices() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: me } = await supa.from("profiles").select("subjects").eq("id", user!.id).single();
  const { data: notices } = await supa.from("notices").select("*").order("created_at", { ascending: false });
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
