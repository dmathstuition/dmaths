import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser, getProfile } from "@/lib/auth";
import { staffCanAccessStudent } from "@/lib/authRole";
import EngagementReport from "@/components/EngagementReport";
import {
  rewardSummary, teacherAwardedFromLogs, summariseMocks, summariseAssignments,
  summarisePractice, summariseAttendance, type MockRow,
} from "@/lib/engagementReport";

export const dynamic = "force-dynamic";
export const metadata = { title: "Engagement report — D-Maths", robots: { index: false } };

export default async function ReportPage({ params }: { params: { studentId: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getProfile();
  const studentId = params.studentId;

  // Authorise: the learner themselves, an admin, a tutor whose roster includes
  // them, or a linked parent.
  const admin = supabaseAdmin();
  let allowed = me?.role === "admin" || studentId === user.id;
  if (!allowed && me?.role === "tutor") {
    allowed = await staffCanAccessStudent({ id: user.id, role: "tutor" }, studentId);
  }
  if (!allowed && me?.role === "parent") {
    const { data: link } = await admin.from("parent_student_links")
      .select("student_id").eq("parent_id", user.id).eq("student_id", studentId).maybeSingle();
    allowed = !!link;
  }
  if (!allowed) notFound();

  const { data: student } = await admin.from("profiles")
    .select("first_name, last_name, student_code, level, reward_points, sanction_points")
    .eq("id", studentId).eq("role", "student").maybeSingle();
  if (!student) notFound();

  // Streak lives on profiles but may not be migrated — read it defensively.
  const { data: streakRow } = await admin.from("profiles").select("streak_count").eq("id", studentId).maybeSingle();

  // Pull the raw activity. Each is best-effort: a not-yet-migrated table just
  // yields an empty set rather than breaking the whole report.
  const [mockRes, subRes, pracRes, attRes, redRes, behRes, fcRes, bossRes, achRes] = await Promise.all([
    admin.from("mock_exam_sessions").select("percent, band, preset, subject, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(100),
    admin.from("assignment_submissions").select("status, grade, assignments(type)").eq("student_id", studentId).limit(400),
    admin.from("practice_sessions").select("total, correct").eq("student_id", studentId).limit(500),
    admin.from("attendance_records").select("present").eq("student_id", studentId).limit(500),
    admin.from("reward_redemptions").select("cost, status").eq("student_id", studentId).limit(500),
    admin.from("behavior_logs").select("behavior_types(points)").eq("student_id", studentId).limit(1000),
    admin.from("flashcard_reviews").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("boss_attempts").select("passed").eq("student_id", studentId),
    admin.from("achievement_claims").select("id", { count: "exact", head: true }).eq("student_id", studentId),
  ]);

  const mockRows = (mockRes.data ?? []) as MockRow[];
  const subs = (subRes.data ?? []).map((r: any) => ({ status: r.status, grade: r.grade, type: r.assignments?.type ?? "written" }));
  const teacherAwarded = teacherAwardedFromLogs((behRes.data ?? []).map((r: any) => ({ points: r.behavior_types?.points ?? 0 })));

  const report = {
    student: {
      name: `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim() || "Student",
      code: student.student_code ?? "—",
      level: student.level ?? "—",
    },
    reward: rewardSummary({
      totalEarned: student.reward_points ?? 0,
      teacherAwarded,
      sanctions: student.sanction_points ?? 0,
      redemptions: (redRes.data ?? []) as any,
    }),
    mocks: {
      ...summariseMocks(mockRows),
      recent: mockRows.slice(0, 6).map((r: any) => ({ percent: r.percent ?? 0, band: r.band ?? "", subject: r.subject ?? "", preset: r.preset ?? "", created_at: r.created_at ?? "" })),
    },
    assignments: summariseAssignments(subs),
    practice: summarisePractice((pracRes.data ?? []) as any),
    attendance: summariseAttendance((attRes.data ?? []) as any),
    extras: {
      flashcardReviews: fcRes.count ?? 0,
      streak: Number((streakRow as any)?.streak_count ?? 0),
      achievements: achRes.count ?? 0,
      bossWins: (bossRes.data ?? []).filter((r: any) => r.passed).length,
    },
    viewerRole: me?.role ?? "student",
    generatedAt: new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }),
  };

  return <EngagementReport report={report} />;
}
