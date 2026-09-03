import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuardianClient from "@/components/guardian/GuardianClient";
import AptitudeParentCard from "@/components/guardian/AptitudeParentCard";
import WeeklySummary from "@/components/guardian/WeeklySummary";
import RateCard from "@/components/portal/RateCard";
import DeleteAccountCard from "@/components/portal/DeleteAccountCard";
import Tour from "@/components/tour/Tour";
import { parentTour } from "@/components/tour/steps";
import { summariseWeek } from "@/lib/weeklySummary";
import { Icon } from "@/components/Icons";

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
          <a href="mailto:support@dmaths.academy" className="font-semibold text-gold-deep hover:underline">
            support@dmaths.academy
          </a>
          .
        </p>
      </div>
    );
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const weekAgoDate = weekAgo.slice(0, 10);

  const students = await Promise.all(
    links.map(async ({ student_id }: { student_id: string }) => {
      const [
        { data: student },
        { data: behaviorLogs },
        { data: behaviorTypes },
        { data: gradedSubs },
        { data: pendingSubs },
        { data: reportCards },
        { data: weekPractice },
        { data: weekMocks },
        { data: weekGraded },
        { data: weekAttendance },
      ] = await Promise.all([
        admin
          .from("profiles")
          .select("first_name, last_name, student_code, level, subjects, avg_score, attendance, reward_points, sanction_points, grade_target, streak_count")
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
        // Report cards (errors harmlessly to null before the migration is run).
        admin
          .from("report_cards")
          .select("id, term, issued_at")
          .eq("student_id", student_id)
          .order("issued_at", { ascending: false })
          .limit(8),
        // This week's activity — each errors harmlessly to null before its
        // migration is run, so the summary just shows fewer signals.
        admin.from("practice_sessions").select("points, created_at").eq("student_id", student_id).gte("created_at", weekAgo),
        admin.from("mock_exam_sessions").select("percent, band, points, created_at").eq("student_id", student_id).gte("created_at", weekAgo),
        admin.from("assignment_submissions").select("grade, submitted_at").eq("student_id", student_id).eq("status", "graded").gte("submitted_at", weekAgo),
        admin.from("attendance_records").select("present, session_date").eq("student_id", student_id).gte("session_date", weekAgoDate),
      ]);

      // Latest aptitude test for this child (null before the migration is run).
      let aptitude: any = null;
      try {
        const { data } = await admin.from("aptitude_tests")
          .select("id, status, scheduled_at, score, total, report")
          .eq("student_id", student_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        aptitude = data ?? null;
      } catch { aptitude = null; }

      const typeMap = new Map((behaviorTypes ?? []).map((t: any) => [t.id, t]));
      const logs = (behaviorLogs ?? []).map((l: any) => ({
        ...l,
        behavior_type: typeMap.get(l.behavior_type_id) ?? null,
      }));

      const weekSummary = summariseWeek({
        practice: (weekPractice ?? []).map((r: any) => ({ at: r.created_at, points: Number(r.points || 0) })),
        mocks: (weekMocks ?? []).map((r: any) => ({ at: r.created_at, percent: Number(r.percent || 0), band: r.band, points: Number(r.points || 0) })),
        graded: (weekGraded ?? []).map((r: any) => ({ at: r.submitted_at, grade: r.grade })),
        attendance: (weekAttendance ?? []).map((r: any) => ({ at: r.session_date, present: !!r.present })),
        behaviour: (behaviorLogs ?? [])
          .map((l: any) => ({ at: l.created_at, points: Number(typeMap.get(l.behavior_type_id)?.points || 0) })),
        streak: Number((student as any)?.streak_count || 0),
      });

      return {
        id: student_id,
        student,
        logs,
        gradedSubs: gradedSubs ?? [],
        pendingCount: pendingSubs?.length ?? 0,
        reportCards: reportCards ?? [],
        weekSummary,
        aptitude,
      };
    }),
  );

  return (
    <div className="space-y-10">
      {students.map(({ id, student, logs, gradedSubs, pendingCount, reportCards, weekSummary, aptitude }, i) =>
        student ? (
          <div key={i} className="space-y-4">
            <WeeklySummary
              name={`${(student as any).first_name ?? ""}`.trim() || "Your child"}
              summary={weekSummary}
            />
            <AptitudeParentCard test={aptitude} childName={`${(student as any).first_name ?? ""}`.trim() || "your child"} />
            <a href={`/report/${id}`}
              className="card flex items-center gap-3 border-l-4 border-l-gold bg-gold-pale/40 p-4 transition hover:bg-gold-pale/70">
              <Icon name="reports" className="h-5 w-5 flex-shrink-0 text-gold-deep" />
              <p className="text-sm text-ink/75">
                <strong className="text-ink">Full engagement report</strong> — reward points (given &amp; earned), mocks, CBT, assignments, attendance and more. →
              </p>
            </a>
            <GuardianClient
              student={student as any}
              behaviorLogs={logs}
              gradedSubs={gradedSubs}
              pendingCount={pendingCount}
              reportCards={reportCards as any}
            />
          </div>
        ) : null,
      )}
      <RateCard />
      <DeleteAccountCard />
      <Tour tourId="parent" steps={parentTour} />
    </div>
  );
}
