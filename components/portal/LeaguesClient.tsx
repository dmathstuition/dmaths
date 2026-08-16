import { Icon } from "@/components/Icons";
import { DIVISIONS, divisionFor, progressToNext } from "@/lib/leagues";

type Row = { id: string; name: string; weekly: number; total: number; isMe: boolean };
type Me = { name: string; total: number; weekly: number; rank: number | null };

// Presentational: a Division hero (climb Bronze → Diamond by lifetime points) and
// a weekly Tournament board (points earned this week, resets every Monday).
export default function LeaguesClient({
  enabled, week, tournament, me, playerCount,
}: {
  enabled: boolean; week: string; tournament: Row[]; me: Me; playerCount: number;
}) {
  const prog = progressToNext(me.total);
  const myDiv = prog.current;

  const rankStyle = (i: number) =>
    i === 0 ? "bg-gold text-board" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-amber-700 text-white" : "bg-chalk text-ink/50";

  return (
    <div className="space-y-6">
      {/* ── Your Division hero ── */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lift sm:p-8"
        style={{ background: `linear-gradient(135deg, ${myDiv.accent} 0%, #0A2A4F 85%)` }}>
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 text-[9rem] opacity-20">{myDiv.emoji}</div>
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">Your division</p>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold sm:text-4xl">
          <span>{myDiv.emoji}</span> {myDiv.name}
        </h1>

        {prog.next ? (
          <div className="mt-4 max-w-md">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-white/80">{prog.remaining} points to {prog.next.emoji} {prog.next.name}</span>
              <span className="text-white/60">{prog.pct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${prog.pct}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-gold">
            <Icon name="trophy" className="h-4 w-4" /> Top division — you've reached the summit!
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
            <Icon name="zap" className="h-4 w-4 text-gold" /> {me.weekly} pts this week
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
            <Icon name="trophy" className="h-4 w-4 text-gold" /> {me.rank ? `Rank #${me.rank} this week` : "Unranked — earn to join in"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
            {me.total} lifetime
          </span>
        </div>
      </div>

      {!enabled && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Run <code>supabase/migration-leagues.sql</code> in Supabase to start the weekly tournament.
        </p>
      )}

      {/* ── This week's tournament ── */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Icon name="students" className="h-5 w-5 text-gold-deep" /> This week's tournament
          </h2>
          <span className="text-xs font-bold text-ink/45">Resets Monday · {playerCount} players</span>
        </div>

        {tournament.length === 0 ? (
          <div className="p-8 text-center">
            <p className="flex justify-center text-ink/25"><Icon name="zap" className="h-9 w-9" /></p>
            <p className="mt-2 font-semibold text-ink">The week's just begun</p>
            <p className="text-sm text-ink/55">Earn some points — practice, mocks, flashcards, the Boss — and be first on the board.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {tournament.map((r, i) => {
              const d = divisionFor(r.total);
              return (
                <li key={r.id} className={`flex items-center gap-3 px-5 py-3 ${r.isMe ? "bg-gold-pale/50" : ""}`}>
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${rankStyle(i)}`}>{i + 1}</span>
                  <span className="text-lg" title={d.name}>{d.emoji}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {r.name}{r.isMe && <span className="ml-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase text-board">You</span>}
                  </span>
                  <span className="flex-shrink-0 font-display text-base font-extrabold text-gold-deep">{r.weekly}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Divisions ladder ── */}
      <div className="card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Divisions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DIVISIONS.map((d) => {
            const here = d.name === myDiv.name;
            return (
              <div key={d.name} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${here ? "border-gold bg-gold-pale" : "border-line"}`}>
                <span className="text-xl">{d.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${here ? "text-gold-deep" : "text-ink"}`}>{d.name}{here && " · you"}</p>
                  <p className="text-xs text-ink/50">{d.min === 0 ? "from the start" : `${d.min}+ lifetime points`}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
