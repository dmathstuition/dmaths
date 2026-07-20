import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Winner = { id: string; first_name: string | null; last_name: string | null; reward_points: number };

function fullName(s: Winner) {
  return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student";
}
function initials(s: Winner) {
  return `${s.first_name?.[0] ?? ""}${s.last_name?.[0] ?? ""}`.toUpperCase() || "S";
}

export default async function LeaderboardPage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const { data } = await supa
    .from("profiles")
    .select("id, first_name, last_name, reward_points")
    .eq("role", "student")
    .eq("is_active", true)
    .gt("reward_points", 0)          // only learners who've actually earned points
    .order("reward_points", { ascending: false })
    .limit(50);

  const top = (data ?? []) as Winner[];
  const myRank = top.findIndex(s => s.id === me?.id) + 1;

  const podium = top.slice(0, 3);
  const rest = top.slice(3);
  // Render the podium in visual order (2nd · 1st · 3rd) so 1st sits centre.
  const podiumOrder = [podium[1], podium[0], podium[2]];
  const MEDAL = ["🥇", "🥈", "🥉"];
  const PLACE_COLOR = ["#EFAE56", "#9CA3AF", "#B87333"];

  return (
    <div className="space-y-6">
      <div className="boardgrid relative overflow-hidden rounded-2xl bg-board p-7 text-white">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <h1 className="relative font-display text-2xl font-semibold sm:text-3xl">🏆 Leaderboard</h1>
        <p className="relative mt-1 text-sm text-white/50">Our top students by reward points · all time</p>
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

      {/* Podium — top 3 */}
      {podium.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {podiumOrder.map((s, col) => {
            if (!s) return <div key={col} />;
            const place = top.indexOf(s);          // 0,1,2
            const isMe = s.id === me?.id;
            const raised = place === 0;
            return (
              <div key={s.id}
                className={`card relative flex flex-col items-center px-2 pb-4 pt-5 text-center ${raised ? "sm:-mt-4" : "mt-2"} ${isMe ? "ring-2 ring-gold/50" : ""}`}>
                <span className="absolute -top-3 text-2xl">{MEDAL[place]}</span>
                <span className="flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold text-white shadow-lift"
                  style={{ background: `linear-gradient(135deg, ${PLACE_COLOR[place]}, #0A2A4F)` }}>
                  {initials(s)}
                </span>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-ink">{fullName(s)}</p>
                {isMe && <span className="text-[11px] font-semibold text-gold-deep">(you)</span>}
                <span className="mt-1 font-display text-lg font-extrabold text-emerald-600">+{s.reward_points}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ranked list — everyone (podium included when there are fewer than 3) */}
      <div className="card divide-y divide-line/60">
        {(podium.length >= 3 ? rest : top).map((student, idx) => {
          const rank = (podium.length >= 3 ? 3 : 0) + idx + 1;
          const isMe = student.id === me?.id;
          const medal = rank <= 3 ? MEDAL[rank - 1] : null;
          return (
            <div key={student.id}
              className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${isMe ? "bg-gold/5" : ""}`}>
              <span className="w-7 flex-shrink-0 text-center font-display text-base font-bold text-ink/30">
                {medal ?? `#${rank}`}
              </span>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ink/90 font-display text-xs font-bold text-gold-soft">
                {initials(student)}
              </span>
              <p className={`flex-1 truncate font-semibold ${isMe ? "text-gold-deep" : "text-ink"}`}>
                {fullName(student)}
                {isMe && <span className="ml-2 text-xs font-normal text-ink/40">(you)</span>}
              </p>
              <span className="flex-shrink-0 font-display text-base font-semibold text-emerald-600">
                +{student.reward_points}
              </span>
            </div>
          );
        })}
        {!top.length && (
          <p className="p-6 text-center text-sm text-ink/40">No reward points earned yet — be the first to top the board! 🏆</p>
        )}
      </div>
    </div>
  );
}
