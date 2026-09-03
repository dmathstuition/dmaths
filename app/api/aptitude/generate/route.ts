import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";
import { aiChat, aiErrorResponse, extractJson } from "@/lib/ai";
import { cleanQuestions, type AptitudeQuestion } from "@/lib/aptitude";

// Admin-only: draft a leveled aptitude test for a learner with the A.I, using
// their class, exam target and the intake profile captured at sign-up. Creates
// a DRAFT row for the admin to preview/edit before approving — nothing is shown
// to the family until it's approved.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (!rateLimit(`aptitude-gen:${staff.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "Give it a few seconds and try again." }, { status: 429 });
  }

  const b = await req.json().catch(() => null);
  const studentId = String(b?.studentId ?? "");
  const count = Math.min(15, Math.max(5, Number(b?.count) || 10));
  if (!studentId) return NextResponse.json({ error: "Pick a learner first." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: student } = await admin
    .from("profiles").select("id, first_name, last_name, level, subjects, email")
    .eq("id", studentId).eq("role", "student").maybeSingle();
  if (!student) return NextResponse.json({ error: "That learner wasn't found." }, { status: 404 });

  // Intake profile from their most recent application (best-effort).
  let intake: any = {};
  if (student.email) {
    const { data: app } = await admin
      .from("applications").select("strengths, challenges, weak_points, exam_target, target_grade")
      .ilike("email", student.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    intake = app ?? {};
  }

  const subjects = Array.isArray(student.subjects) && student.subjects.length ? student.subjects.join(", ") : "Mathematics";
  const level = student.level || "";
  const examTarget = intake.exam_target || "";

  const system = `You are an assessment designer for D-Maths, an online tuition service for Nigerian primary/secondary learners (WAEC/JAMB/NECO/BECE aligned where relevant).

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

  let text: string;
  try {
    text = await aiChat({ system, user: "Design the diagnostic now.", maxTokens: 2600 });
  } catch (err) {
    return aiErrorResponse(err);
  }

  const parsed = extractJson<{ questions?: AptitudeQuestion[] }>(text);
  const questions = cleanQuestions(parsed?.questions ?? (Array.isArray(parsed) ? parsed : []));
  if (!questions.length) {
    return NextResponse.json({ error: "The A.I didn't return usable questions — try again." }, { status: 502 });
  }

  const { data: row, error } = await admin.from("aptitude_tests").insert({
    student_id: studentId, level, exam_target: examTarget,
    questions, status: "draft", created_by: staff.id,
  }).select("*").maybeSingle();
  if (error) {
    return NextResponse.json({
      error: /relation .*aptitude_tests/i.test(error.message)
        ? "Run migration-aptitude.sql in Supabase to enable aptitude tests."
        : error.message,
    }, { status: 500 });
  }
  return NextResponse.json({ ok: true, test: row });
}
