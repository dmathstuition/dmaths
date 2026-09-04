import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import GuardianPortalClient from "@/components/guardian/GuardianPortalClient";
import { owingSummary } from "@/lib/payments";
import { segmentScores } from "@/lib/aptitude";

export const dynamic = "force-dynamic";

export default async function GuardianPage({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();

  const { data: tokenRow } = await admin
    .from("guardian_tokens")
    .select("student_id, expires_at, guardian_email")
    .eq("token", params.token)
    .single();

  if (!tokenRow) notFound();

  if (new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-700">This link has expired.</p>
        <p className="mt-2 text-sm text-red-600">Please ask the tutor to send you a new portal link.</p>
      </div>
    );
  }

  const studentId = tokenRow.student_id;

  const [
    { data: student },
    { data: behaviorLogs },
    { data: behaviorTypes },
    { data: gradedSubs },
    { data: pendingSubs },
    { data: reportCards },
    { data: attendance },
  ] = await Promise.all([
    admin.from("profiles")
      .select("first_name, last_name, student_code, level, subjects, email, avg_score, attendance, reward_points, sanction_points, grade_target, sub_active, sub_amount, sub_due_date")
      .eq("id", studentId).single(),
    admin.from("behavior_logs")
      .select("behavior_type_id, notes, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }).limit(5),
    admin.from("behavior_types").select("id, name, category, points"),
    admin.from("assignment_submissions")
      .select("grade, submitted_at, assignment:assignments(title, subject)")
      .eq("student_id", studentId).eq("status", "graded")
      .order("submitted_at", { ascending: false }).limit(5),
    admin.from("assignment_submissions")
      .select("id").eq("student_id", studentId).eq("status", "pending"),
    admin.from("report_cards").select("id, term, issued_at")
      .eq("student_id", studentId).order("issued_at", { ascending: false }).limit(8),
    admin.from("attendance_records").select("session_date, present, late")
      .eq("student_id", studentId).order("session_date", { ascending: false }).limit(60),
  ]);

  if (!student) notFound();

  const typeMap = new Map((behaviorTypes ?? []).map((t: any) => [t.id, t]));
  const logs = (behaviorLogs ?? []).map((l: any) => ({ ...l, behavior_type: typeMap.get(l.behavior_type_id) ?? null }));

  // Payments for this learner (by id or the email their payments were recorded against).
  const email = (student.email ?? "").toLowerCase();
  const { data: payments } = await admin.from("payments")
    .select("reference, amount, channel, status, paid_at, created_at, student_id, email")
    .or(`student_id.eq.${studentId}${email ? `,email.eq."${email}"` : ""}`)
    .eq("status", "success").order("paid_at", { ascending: false }).limit(100);
  const payRows = payments ?? [];
  const summary = owingSummary(student ?? {}, payRows);

  // Latest aptitude test + per-segment breakdown (computed server-side).
  let aptitude: any = null;
  try {
    const { data } = await admin.from("aptitude_tests")
      .select("id, status, scheduled_at, score, total, report, questions, answers")
      .eq("student_id", studentId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    aptitude = data ? {
      id: data.id, status: data.status, scheduled_at: data.scheduled_at,
      score: data.score, total: data.total, report: data.report,
      segments: data.answers ? segmentScores(data.questions ?? [], data.answers) : [],
    } : null;
  } catch { aptitude = null; }

  return (
    <GuardianPortalClient
      student={student as any}
      behaviorLogs={logs}
      gradedSubs={gradedSubs ?? []}
      pendingCount={pendingSubs?.length ?? 0}
      reportCards={(reportCards ?? []) as any}
      attendance={(attendance ?? []) as any}
      payments={payRows as any}
      owing={summary}
      aptitude={aptitude}
    />
  );
}
