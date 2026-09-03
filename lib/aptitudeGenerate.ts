import type { SupabaseClient } from "@supabase/supabase-js";
import { aiChat, extractJson } from "@/lib/ai";
import { cleanQuestions, type AptitudeQuestion } from "@/lib/aptitude";

type Intake = {
  strengths?: string | null; challenges?: string | null; weak_points?: string | null;
  exam_target?: string | null; target_grade?: string | null;
};
type StudentInfo = { level?: string | null; subjects?: string[] | null; first_name?: string | null };

// The system prompt for a leveled diagnostic — shared so the generator behaves
// identically whether triggered by the admin console or automatically on
// approval.
export function buildAptitudePrompt(opts: { count: number; student: StudentInfo; intake: Intake }): string {
  const { count, student, intake } = opts;
  const subjects = Array.isArray(student.subjects) && student.subjects.length ? student.subjects.join(", ") : "Mathematics";
  const level = student.level || "";
  const examTarget = intake.exam_target || "";
  return `You are an assessment designer for D-Maths, an online tuition service for Nigerian primary/secondary learners (WAEC/JAMB/NECO/BECE aligned where relevant).

Design a DIAGNOSTIC aptitude test of exactly ${count} multiple-choice questions to gauge a new learner's true working level. Judge the right pitch yourself from the learner's details, and spread difficulty from foundational to stretch so the score locates their level.

Learner details:
- Class / year: ${level || "unknown"}
- Classes taking: ${subjects}
${examTarget ? `- Preparing for: ${examTarget}${intake.target_grade ? ` (target ${intake.target_grade})` : ""}` : ""}
${intake.strengths ? `- Strengths noted: ${intake.strengths}` : ""}
${intake.challenges ? `- Challenges noted: ${intake.challenges}` : ""}
${intake.weak_points ? `- Weak points noted: ${intake.weak_points}` : ""}

RULES:
- Each question has exactly 4 options with ONE correct answer.
- "answer" is the 0-based index (0–3) of the correct option.
- Probe the weak points and, where relevant, the exam's style.
- Age-appropriate, clear, correct. British/Nigerian spelling. No letter labels or explanations inside the text.

Return ONLY strict JSON, no prose:
{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0}]}`;
}

// Generate a leveled aptitude test and store it as a DRAFT for the learner.
// Resolves the learner and their sign-up intake profile when not supplied.
// Returns the created row, or a typed error. aiChat may throw (AI unavailable) —
// callers decide whether that's fatal (the admin console) or ignorable (approval).
export async function createAptitudeTest(
  admin: SupabaseClient,
  opts: { studentId: string; count?: number; createdBy?: string | null; student?: StudentInfo; intake?: Intake },
): Promise<{ test?: any; error?: string; status?: number }> {
  const count = Math.min(15, Math.max(5, Number(opts.count) || 10));

  let student = opts.student;
  let email = "";
  if (!student) {
    const { data } = await admin.from("profiles")
      .select("first_name, level, subjects, email").eq("id", opts.studentId).eq("role", "student").maybeSingle();
    if (!data) return { error: "That learner wasn't found.", status: 404 };
    student = data;
    email = (data as any).email ?? "";
  }

  let intake = opts.intake;
  if (!intake && email) {
    const { data: app } = await admin.from("applications")
      .select("strengths, challenges, weak_points, exam_target, target_grade")
      .ilike("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    intake = app ?? {};
  }
  intake = intake ?? {};

  const system = buildAptitudePrompt({ count, student, intake });
  const text = await aiChat({ system, user: "Design the diagnostic now.", maxTokens: 2600 });

  const parsed = extractJson<{ questions?: AptitudeQuestion[] }>(text);
  const questions = cleanQuestions(parsed?.questions ?? (Array.isArray(parsed) ? parsed : []));
  if (!questions.length) return { error: "The A.I didn't return usable questions — try again.", status: 502 };

  const { data: row, error } = await admin.from("aptitude_tests").insert({
    student_id: opts.studentId,
    level: student.level || "",
    exam_target: intake.exam_target || "",
    questions, status: "draft", created_by: opts.createdBy ?? null,
  }).select("*").maybeSingle();
  if (error) {
    return {
      error: /relation .*aptitude_tests/i.test(error.message)
        ? "Run migration-aptitude.sql in Supabase to enable aptitude tests."
        : error.message,
      status: 500,
    };
  }
  return { test: row };
}
