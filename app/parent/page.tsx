import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuardianClient from "@/components/guardian/GuardianClient";
import RateCard from "@/components/portal/RateCard";

export const dynamic = "force-dynamic";

export default async function ParentPage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null; // layout already redirects if no session

  const admin = supabaseAdmin();

  const { data: links } = await admin
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", user.id);

  if (!links || links.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-xl font-semibold text-ink">No students linked yet.</p>
        <p className="mt-2 text-sm text-ink/55">
          If you believe this is a mistake, contact{" "}
          <a href="mailto:dmathstuition@gmail.com" className="font-semibold text-gold-deep hover:underline">
            dmathstuition@gmail.com
          </a>
          .
        </p>
      </div>
    );
  }

  const students = await Promise.all(
    links.map(async ({ student_id }: { student_id: string }) => {
      const [
        { data: student },
        { data: behaviorLogs },
        { data: behaviorTypes },
        { data: gradedSubs },
        { data: pendingSubs },
      ] = await Promise.all([
        admin
          .from("profiles")
          .select("first_name, last_name, student_code, level, avg_score, attendance, reward_points, sanction_points, grade_target")
          .eq("id", student_id)
          .single(),
        admin
          .from("behavior_logs")
          .select("behavior_type_id, notes, created_at")
          .eq("student_id", student_id)
          .order("created_at", { ascending: false })
          .limit(5),
        admin.from("behavior_types").select("id, name, category, points"),
        admin
          .from("assignment_submissions")
          .select("grade, submitted_at, assignment:assignments(title, subject)")
          .eq("student_id", student_id)
          .eq("status", "graded")
          .order("submitted_at", { ascending: false })
          .limit(5),
        admin
          .from("assignment_submissions")
          .select("id")
          .eq("student_id", student_id)
          .eq("status", "pending"),
      ]);

      const typeMap = new Map((behaviorTypes ?? []).map((t: any) => [t.id, t]));
      const logs = (behaviorLogs ?? []).map((l: any) => ({
        ...l,
        behavior_type: typeMap.get(l.behavior_type_id) ?? null,
      }));

      return {
        student,
        logs,
        gradedSubs: gradedSubs ?? [],
        pendingCount: pendingSubs?.length ?? 0,
      };
    }),
  );

  return (
    <div className="space-y-10">
      {students.map(({ student, logs, gradedSubs, pendingCount }, i) =>
        student ? (
          <GuardianClient
            key={i}
            student={student as any}
            behaviorLogs={logs}
            gradedSubs={gradedSubs}
            pendingCount={pendingCount}
          />
        ) : null,
      )}
      <RateCard />
    </div>
  );
}
