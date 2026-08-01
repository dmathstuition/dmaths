import LeaderboardClient from "@/components/portal/LeaderboardClient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await getProfile();
  // A learner's RLS only exposes their OWN profile row, so ranking every learner
  // needs the service-role client. Only leaderboard-safe fields are selected and
  // sent on (first name, points, class/program) — no contact details, etc.
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("profiles")
    .select("id, first_name, last_name, reward_points, level, subjects")
    .eq("role", "student")
    .eq("is_active", true)
    .gt("reward_points", 0)          // only learners who've actually earned points
    .order("reward_points", { ascending: false })
    .limit(200);

  const winners = (data ?? []) as any[];
  // Dropdown options — the classes (levels) and programs (subjects) that
  // actually have ranked learners, so no empty scope can be chosen.
  const levels = Array.from(new Set(winners.map(w => w.level).filter(Boolean))).sort() as string[];
  const subjects = Array.from(new Set(winners.flatMap(w => w.subjects ?? []).filter(Boolean))).sort() as string[];

  return (
    <LeaderboardClient
      meId={me?.id ?? ""}
      myLevel={(me as any)?.level ?? ""}
      mySubjects={((me as any)?.subjects ?? []) as string[]}
      winners={winners}
      levels={levels}
      subjects={subjects}
    />
  );
}
