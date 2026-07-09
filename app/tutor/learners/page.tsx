import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getRoster } from "@/lib/authRole";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The tutor's roster: everyone in their classes + directly-assigned learners.
export default async function TutorLearners() {
  const user = await getUser();
  const rosterIds = user ? await getRoster(user.id) : [];

  let learners: any[] = [];
  if (rosterIds.length) {
    const { data } = await supabaseAdmin()
      .from("profiles")
      .select("id, first_name, last_name, level, subjects, avg_score, attendance, reward_points, student_code")
      .in("id", rosterIds)
      .order("first_name", { ascending: true });
    learners = data ?? [];
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">My Learners</h1>
        <p className="text-sm text-ink/50">Learners in your classes and those assigned to you directly.</p>
      </div>

      {learners.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/45">
          No learners assigned to you yet. The admin adds learners by assigning you to a class or
          linking them to you directly.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {learners.map((s) => (
            <Link key={s.id} href={`/tutor/learners/${s.id}`}
              className="card card-interactive flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-display text-base font-bold">{s.first_name} {s.last_name}</p>
                <p className="font-mono text-xs text-ink/45">{s.student_code} · {s.level}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(s.subjects ?? []).slice(0, 3).map((sub: string) => (
                    <span key={sub} className="pill-blue !py-0.5 !text-[10px]">{sub}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-gold-deep">{s.avg_score ?? 0}%</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">Avg</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
