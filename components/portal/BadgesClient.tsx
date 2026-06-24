"use client";
import { Icon, type IconName } from "@/components/Icons";

interface Badge {
  id: string; slug: string; name: string; description: string;
  icon: string; color: string; points_threshold: number | null;
}
interface EarnedBadge { badge_id: string; earned_at: string; }

export default function BadgesClient({
  allBadges, earned, rewardPoints,
}: {
  allBadges: Badge[]; earned: EarnedBadge[]; rewardPoints: number;
}) {
  const earnedMap = new Map(earned.map(e => [e.badge_id, e.earned_at]));
  const earnedCount = earned.length;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Badges</h1>
        <p className="mt-1 text-sm text-white/50">
          {earnedCount} of {allBadges.length} earned · {rewardPoints} reward pts total
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allBadges.map(badge => {
          const earnedAt = earnedMap.get(badge.id);
          const isEarned = !!earnedAt;
          const ptsLeft = badge.points_threshold !== null ? badge.points_threshold - rewardPoints : null;

          return (
            <div key={badge.id}
              className={`rounded-2xl border p-5 transition ${isEarned ? "border-transparent shadow-md" : "border-line opacity-60"}`}
              style={isEarned ? { background: `${badge.color}12`, borderColor: `${badge.color}40` } : undefined}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: isEarned ? badge.color : "#94a3b8" }}>
                  <Icon name={badge.icon as IconName} className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink">{badge.name}</p>
                  <p className="text-xs text-ink/55 mt-0.5">{badge.description}</p>
                </div>
              </div>
              <div className="mt-3">
                {isEarned ? (
                  <p className="text-xs font-semibold" style={{ color: badge.color }}>
                    Earned {new Date(earnedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                ) : ptsLeft !== null && ptsLeft > 0 ? (
                  <>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full transition-all" style={{
                        background: badge.color,
                        width: `${Math.min(100, Math.round((rewardPoints / badge.points_threshold!) * 100))}%`,
                      }} />
                    </div>
                    <p className="mt-1 text-xs text-ink/40">{ptsLeft} more pts to go</p>
                  </>
                ) : (
                  <p className="text-xs text-ink/40">Special achievement</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
