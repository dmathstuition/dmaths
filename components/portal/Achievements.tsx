import { getUser, getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Icon, type IconName } from "@/components/Icons";
import { computeAchievements, unlockedCount } from "@/lib/achievements";

// A learner's trophy room — milestones computed from their own stats. Server
// component: reads a few counts with the service role, all degrading to 0 if a
// source table isn't migrated yet.
export default async function Achievements() {
  const user = await getUser();
  const me = await getProfile();
  if (!user || !me) return null;
  const admin = supabaseAdmin();

  const head = (q: any) => q.then((r: any) => r.count ?? 0).catch(() => 0);
  const [titles, mocks, practice, cards] = await Promise.all([
    head(admin.from("learner_cosmetics").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("kind", "title")),
    head(admin.from("mock_exam_sessions").select("id", { count: "exact", head: true }).eq("student_id", user.id)),
    head(admin.from("practice_sessions").select("id", { count: "exact", head: true }).eq("student_id", user.id)),
    head(admin.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("student_id", user.id)),
  ]);

  const list = computeAchievements({
    streak: (me as any).streak_count ?? 0,
    points: (me as any).reward_points ?? 0,
    avgScore: (me as any).avg_score ?? 0,
    titles, mocks, practice, cards,
    referrals: (me as any).referral_count ?? 0,
  });
  const got = unlockedCount(list);

  return (
    <div className="card neu-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Icon name="trophy" className="h-5 w-5 text-gold-deep" /> Achievements
        </h2>
        <span className="rounded-full bg-gold-pale px-2.5 py-1 text-[11px] font-bold text-gold-deep">{got}/{list.length} unlocked</span>
      </div>

      {/* progress bar across all achievements */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-deep transition-[width] duration-700" style={{ width: `${Math.round((got / list.length) * 100)}%` }} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((a) => (
          <div key={a.id}
            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              a.unlocked ? "border-gold/40 bg-gold-pale/50 dark:bg-gold/10" : "border-line bg-chalk/50 dark:bg-white/[0.02]"}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              a.unlocked ? "bg-gold text-board shadow-[0_6px_18px_-6px_rgba(239,174,86,.8)]" : "bg-ink/5 text-ink/25"}`}>
              <Icon name={a.icon as IconName} className="h-6 w-6" />
            </span>
            <div>
              <p className={`text-[13px] font-bold ${a.unlocked ? "text-ink" : "text-ink/45"}`}>{a.name}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-ink/40">{a.unlocked ? "Unlocked" : a.desc}</p>
            </div>
            {!a.unlocked && a.target > 1 && (
              <span className="text-[10px] font-bold text-ink/35">{a.current}/{a.target}</span>
            )}
            {a.unlocked && <span aria-hidden className="absolute right-2 top-2 text-emerald-500"><Icon name="checkCircle" className="h-4 w-4" /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}
