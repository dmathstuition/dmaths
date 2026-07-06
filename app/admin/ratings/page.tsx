import { supabaseServer } from "@/lib/supabase/server";
import { Icon } from "@/components/Icons";
import Reveal from "@/components/landing/Reveal";

export const dynamic = "force-dynamic";

type Rating = {
  id: string;
  user_id: string;
  role: string;
  stars: number;
  comment: string;
  created_at: string;
};

export default async function AdminRatings() {
  const supa = supabaseServer();
  const { data: ratings } = await supa
    .from("ratings").select("*").order("created_at", { ascending: false }).limit(200);

  const list: Rating[] = ratings ?? [];

  // Resolve names for the rows we're showing (one query, not N).
  const ids = Array.from(new Set(list.map((r) => r.user_id)));
  const nameById = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await supa
      .from("profiles").select("id, first_name, last_name").in("id", ids);
    (people ?? []).forEach((p: any) =>
      nameById.set(p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Someone"),
    );
  }

  const count = list.length;
  const avg = count ? (list.reduce((a, r) => a + r.stars, 0) / count) : 0;

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-board to-boardDeep p-7 text-white sm:p-9">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20"
            style={{ background: "radial-gradient(circle at 80% 20%, #EFAE56, transparent 60%)" }} />
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[.2em] text-white/40">Feedback</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Ratings &amp; comments</h1>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="glass-hero-chip px-5 py-3">
                <p className="font-display text-3xl font-semibold">
                  {avg ? avg.toFixed(1) : "—"} <span className="text-gold">★</span>
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Average</p>
              </div>
              <div className="glass-hero-chip px-5 py-3">
                <p className="font-display text-3xl font-semibold">{count}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Total ratings</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {count === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-ink/30">
          <Icon name="thumbsUp" className="h-10 w-10" />
          <p className="text-sm">No ratings yet. They&apos;ll appear here as students and parents leave feedback.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gold" aria-label={`${r.stars} stars`}>
                    {"★".repeat(r.stars)}<span className="text-line">{"★".repeat(5 - r.stars)}</span>
                  </span>
                  <span className="text-sm font-bold text-ink">{nameById.get(r.user_id) ?? "Someone"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.role === "parent" ? "bg-ink/10 text-ink/60" : "bg-gold-pale text-gold-deep"}`}>
                    {r.role}
                  </span>
                </div>
                <span className="text-xs text-ink/40">
                  {new Date(r.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </span>
              </div>
              {r.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/70">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
