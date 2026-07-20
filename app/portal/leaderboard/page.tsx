import LeaderboardClient from "@/components/portal/LeaderboardClient";
import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const me = await getProfile();
  const supa = supabaseServer();

  const { data } = await supa
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
