import { Icon } from "@/components/Icons";
import { TIER_META, type SubjectMap, type MasteryTier } from "@/lib/skillTree";

const ORDER: MasteryTier[] = ["new", "learning", "proficient", "mastered"];

// A learner's knowledge map — question-bank topics grouped by subject, each node
// coloured by how well they've done on it. Presentational; the page supplies the
// computed map.
export default function SkillTree({ map }: { map: SubjectMap[] }) {
  const totals = map.reduce((a, s) => { a.total += s.total; a.mastered += s.mastered; return a; }, { total: 0, mastered: 0 });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* hero */}
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="aurora pointer-events-none absolute inset-0" />
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25"><Icon name="sigma" className="h-6 w-6" /></span>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Knowledge map</h1>
          <p className="mt-1 text-sm text-white/55">
            {totals.total > 0 ? `${totals.mastered} of ${totals.total} topics mastered — practise to light up the rest.` : "Sit practice rounds & mocks to map your mastery."}
          </p>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {ORDER.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink/55">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TIER_META[t].color }} /> {TIER_META[t].label}
          </span>
        ))}
      </div>

      {map.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center text-ink/40">
          <Icon name="sigma" className="h-10 w-10 text-ink/25" />
          <p className="text-sm">No topics for your subjects yet — check back once the question bank is set up.</p>
        </div>
      ) : (
        map.map((s) => {
          const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0;
          return (
            <div key={s.subject} className="card neu-card p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-ink">{s.subject}</h2>
                <span className="rounded-full bg-chalk px-2.5 py-1 text-[11px] font-bold text-ink/50">{s.mastered}/{s.total} mastered</span>
              </div>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {s.topics.map((t) => {
                  const c = TIER_META[t.tier].color;
                  return (
                    <span key={t.topic}
                      title={t.total > 0 ? `${TIER_META[t.tier].label} · ${t.correct}/${t.total} correct (${t.pct}%)` : "Not started"}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition"
                      style={{ borderColor: `${c}55`, backgroundColor: `${c}14`, color: c }}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                      {t.topic}
                      {t.total > 0 && <span className="opacity-70">{t.pct}%</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <p className="px-1 text-[12px] text-ink/45">
        Topics light up as you answer them in <a href="/portal/practice" className="font-bold text-gold-deep hover:underline">Practice</a> and <a href="/portal/mock-exam" className="font-bold text-gold-deep hover:underline">Mock exams</a>.
      </p>
    </div>
  );
}
