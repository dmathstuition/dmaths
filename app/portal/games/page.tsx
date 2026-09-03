import Link from "next/link";
import { Icon } from "@/components/Icons";
import { getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { gamesByGroup, liveGameCount, type GameEntry } from "@/lib/gameCenter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Game Center · D-Maths" };

function nameOf(w: any) {
  const f = (w?.first_name ?? "").trim();
  const li = w?.last_name?.trim?.()?.[0];
  return (f + (li ? ` ${li.toUpperCase()}.` : "")).trim() || "Student";
}

export default async function GameCenterPage() {
  const me = await getProfile();
  const points = Number((me as any)?.reward_points ?? 0);
  const streak = Number((me as any)?.streak_count ?? 0);

  // A tiny live top-3 snapshot for the hero (service role — a learner can only
  // read their own row otherwise). Best-effort: a hiccup just hides the strip.
  let top: any[] = [];
  try {
    const admin = supabaseAdmin();
    const { data } = await admin
      .from("profiles")
      .select("first_name, last_name, reward_points")
      .eq("role", "student").eq("is_active", true)
      .order("reward_points", { ascending: false }).limit(3);
    top = (data ?? []).filter((w: any) => (w.reward_points ?? 0) > 0);
  } catch { /* no snapshot */ }

  const groups = gamesByGroup();

  return (
    <div className="space-y-7">
      {/* Arcade hero */}
      <div className="boardgrid relative overflow-hidden rounded-2xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div className="aurora pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gold/15 text-gold ring-1 ring-gold/25">
            <Icon name="trophy" className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Game Center</h1>
            <p className="mt-1 text-sm text-white/55">
              Every game, challenge and reward in one place — play, compete and climb the boards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="glass-hero-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold">
              <Icon name="star" className="h-4 w-4 text-gold" /> {points.toLocaleString()} pts
            </span>
            <span className="glass-hero-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold">
              <Icon name="flame" className="h-4 w-4 text-amber-300" /> {streak}-day streak
            </span>
            <span className="glass-hero-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold">
              <Icon name="grid" className="h-4 w-4 text-white/70" /> {liveGameCount()} to play
            </span>
          </div>
        </div>

        {top.length > 0 && (
          <div className="relative mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">This season's top</span>
            {top.map((w, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white/85 ring-1 ring-white/10">
                <span className={`font-display font-bold ${i === 0 ? "text-gold" : i === 1 ? "text-slate-200" : "text-amber-500"}`}>#{i + 1}</span>
                {nameOf(w)}
                <span className="text-white/50">· {Number(w.reward_points ?? 0).toLocaleString()}</span>
              </span>
            ))}
            <Link href="/portal/leaderboard" className="ml-auto text-[13px] font-bold text-gold-soft hover:underline">
              Full leaderboard →
            </Link>
          </div>
        )}
      </div>

      {/* Game shelves */}
      {groups.map(({ group, games }) => (
        <section key={group} className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">{group}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => <GameTile key={g.id} game={g} />)}
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-ink/35">
        New games land here over time — keep an eye out for the <span className="font-bold text-gold-deep">New</span> ribbon.
      </p>
    </div>
  );
}

function GameTile({ game }: { game: GameEntry }) {
  const soon = game.status === "soon";
  const inner = (
    <>
      <span className="absolute right-0 top-0 h-24 w-24 rounded-bl-[3rem] opacity-10 transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: game.accent }} />
      {game.status === "new" && (
        <span className="absolute right-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow">New</span>
      )}
      {soon && (
        <span className="absolute right-3 top-3 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-ink/50">Soon</span>
      )}
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
        style={{ background: game.accent }}>
        <Icon name={game.icon} className="h-6 w-6" />
      </span>
      <h3 className="relative mt-4 font-display text-base font-bold text-ink">{game.title}</h3>
      <p className="relative mt-1 text-[13px] leading-relaxed text-ink/55">{game.blurb}</p>
      {!soon && (
        <span className="relative mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-gold-deep">
          Play <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      )}
    </>
  );

  const cls = "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm transition-all duration-300";
  if (soon) {
    return <div className={`${cls} cursor-default border-dashed opacity-70`} aria-disabled>{inner}</div>;
  }
  return <Link href={game.href} className={`${cls} hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg`}>{inner}</Link>;
}
