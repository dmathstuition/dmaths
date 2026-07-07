import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const { data: top } = await supa
    .from("profiles")
    .select("id, first_name, reward_points")
    .eq("role", "student")
    .eq("is_active", true)
    .gt("reward_points", 0)          // only learners who've actually earned points
    .order("reward_points", { ascending: false })
    .limit(50);

  const myRank = top ? top.findIndex(s => s.id === me?.id) + 1 : 0;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-white/50">Top students by reward points · all time</p>
      </div>

      {myRank > 0 && (
        <div className="card flex items-center gap-4 p-4">
          <span className="font-display text-3xl font-bold text-gold-deep">#{myRank}</span>
          <div>
            <p className="font-semibold text-ink">Your position</p>
            <p className="text-xs text-ink/40">{me?.reward_points ?? 0} reward pts</p>
          </div>
        </div>
      )}

      <div className="card divide-y divide-line/60">
        {(top ?? []).map((student, i) => {
          const isMe = student.id === me?.id;
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <div key={student.id}
              className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? "bg-gold/5" : ""}`}>
              <span className="w-8 text-center font-display text-lg font-bold text-ink/30">
                {medal ?? `#${i + 1}`}
              </span>
              <p className={`flex-1 font-semibold ${isMe ? "text-gold-deep" : "text-ink"}`}>
                {student.first_name}
                {isMe && <span className="ml-2 text-xs font-normal text-ink/40">(you)</span>}
              </p>
              <span className="font-display text-lg font-semibold text-emerald-600">
                +{student.reward_points}
              </span>
            </div>
          );
        })}
        {!top?.length && <p className="p-6 text-center text-sm text-ink/40">No reward points earned yet — be the first to top the board! 🏆</p>}
      </div>
    </div>
  );
}
