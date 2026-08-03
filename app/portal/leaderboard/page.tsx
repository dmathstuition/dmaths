import LeaderboardClient from "@/components/portal/LeaderboardClient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { currentSeason, seasonLabel, seasonPoints, rankChampions } from "@/lib/seasons";

export const dynamic = "force-dynamic";

function nameOf(w: any) {
  const f = (w.first_name ?? "").trim();
  const li = w.last_name?.trim()?.[0];
  return (f + (li ? ` ${li.toUpperCase()}.` : "")).trim() || "Student";
}

export default async function LeaderboardPage() {
  const me = await getProfile();
  // A learner's RLS only exposes their OWN profile row, so ranking every learner
  // needs the service-role client. Only leaderboard-safe fields are selected and
  // sent on (first name, points, class/program) — no contact details, etc.
  const admin = supabaseAdmin();

  // Everyone active (incl. 0-point) so season baselines can be snapshotted; the
  // all-time board itself only shows those who've actually earned points.
  const core = "id, first_name, last_name, reward_points, level, subjects";
  const rank = (cols: string) => admin
    .from("profiles").select(cols)
    .eq("role", "student").eq("is_active", true)
    .order("reward_points", { ascending: false }).limit(1000);

  // The avatar-studio cosmetic columns may not be migrated yet — fall back to
  // the core fields so the board still ranks (just without the cosmetic flex).
  const primary = await rank(`${core}, avatar_choice, avatar_title`);
  const all: any[] = (primary.error ? (await rank(core)).data : primary.data) ?? [];

  const learners = all;

  // ── Seasons: snapshot at rollover, compute past champions, attach season pts ──
  const season = currentSeason();
  let seasonEnabled = true;
  let baseline = new Map<string, number>();
  let champions: { rank: number; name: string; points: number }[] = [];
  let hofLabel = "";

  const { data: curBase, error: baseErr } = await admin
    .from("season_baselines").select("student_id, baseline").eq("season", season);

  if (baseErr) {
    seasonEnabled = false; // migration-leaderboard-seasons.sql not run yet
  } else {
    baseline = new Map((curBase ?? []).map((b: any) => [b.student_id, b.baseline]));

    // No baseline for this season → a rollover (or first run). Snapshot everyone
    // now, and record the previous season's champions if not already done.
    if (!curBase?.length && learners.length) {
      const { data: prevRows } = await admin
        .from("season_baselines").select("season").order("season", { ascending: false }).limit(1);
      const prevSeason = prevRows?.[0]?.season && prevRows[0].season < season ? prevRows[0].season : null;

      const rows = learners.map((l) => ({ student_id: l.id, season, baseline: l.reward_points ?? 0 }));
      await admin.from("season_baselines").upsert(rows, { onConflict: "student_id,season", ignoreDuplicates: true });
      baseline = new Map(rows.map((r) => [r.student_id, r.baseline]));

      if (prevSeason) {
        const { data: already } = await admin.from("season_champions").select("rank").eq("season", prevSeason).limit(1);
        if (!already?.length) {
          const { data: prevBase } = await admin.from("season_baselines").select("student_id, baseline").eq("season", prevSeason);
          const prevMap = new Map((prevBase ?? []).map((b: any) => [b.student_id, b.baseline]));
          // Gain over the completed season = total now − that season's baseline.
          const gains = learners.map((l) => ({
            id: l.id, name: nameOf(l),
            gain: seasonPoints(l.reward_points, prevMap.get(l.id) ?? l.reward_points),
          }));
          const champs = rankChampions(gains, 3);
          if (champs.length) {
            await admin.from("season_champions").upsert(
              champs.map((c) => ({ season: prevSeason, rank: c.rank, student_id: c.id, name: c.name, points: c.gain })),
              { onConflict: "season,rank", ignoreDuplicates: true },
            );
          }
        }
      }
    }

    // Latest recorded champions (top 3 of the most recent completed season).
    const { data: hof } = await admin
      .from("season_champions").select("season, rank, name, points")
      .order("season", { ascending: false }).order("rank", { ascending: true }).limit(3);
    if (hof?.length) {
      hofLabel = seasonLabel(hof[0].season);
      champions = hof.filter((c: any) => c.season === hof[0].season).map((c: any) => ({ rank: c.rank, name: c.name, points: c.points }));
    }
  }

  // The all-time board: only learners who've earned points. Attach this season's
  // score so the client can toggle "This month".
  const winners = learners
    .filter((w) => (w.reward_points ?? 0) > 0)
    .map((w) => ({ ...w, season_points: seasonPoints(w.reward_points, baseline.get(w.id) ?? w.reward_points) }));

  const levels = Array.from(new Set(winners.map((w) => w.level).filter(Boolean))).sort() as string[];
  const subjects = Array.from(new Set(winners.flatMap((w) => w.subjects ?? []).filter(Boolean))).sort() as string[];

  return (
    <LeaderboardClient
      meId={me?.id ?? ""}
      myLevel={(me as any)?.level ?? ""}
      mySubjects={((me as any)?.subjects ?? []) as string[]}
      winners={winners}
      levels={levels}
      subjects={subjects}
      seasonEnabled={seasonEnabled}
      seasonName={seasonLabel(season)}
      champions={champions}
      hofLabel={hofLabel}
    />
  );
}
