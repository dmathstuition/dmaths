import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRoster } from "@/lib/authRole";

// Admin-only: a summary of what a tutor has been doing — headline counts plus a
// recent-actions feed drawn from audit_log (actor_id = tutor).
export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tutorId = new URL(req.url).searchParams.get("tutorId");
  if (!tutorId) return NextResponse.json({ error: "tutorId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const [
    roster,
    { count: classesCount },
    { count: directCount },
    { count: materialsCount },
    { data: log },
  ] = await Promise.all([
    getRoster(tutorId),
    admin.from("classes").select("id", { count: "exact", head: true }).eq("tutor_id", tutorId),
    admin.from("teacher_students").select("student_id", { count: "exact", head: true }).eq("teacher_id", tutorId),
    admin.from("lesson_materials").select("id", { count: "exact", head: true }).eq("uploaded_by", tutorId),
    admin.from("audit_log").select("action, detail, created_at")
      .eq("actor_id", tutorId).order("created_at", { ascending: false }).limit(40),
  ]);

  const rows = log ?? [];
  const countAction = (a: string) => rows.filter((r: any) => r.action === a).length;

  return NextResponse.json({
    ok: true,
    summary: {
      learners: roster.length,
      directLearners: directCount ?? 0,
      classes: classesCount ?? 0,
      materials: materialsCount ?? 0,
      // These come from the (last-40) audit window, so they read "recent".
      rewards: countAction("reward_given"),
      behaviour: countAction("log_behaviour"),
      assignments: countAction("assignment_created"),
      graded: countAction("grade_assignment"),
    },
    recent: rows.slice(0, 20),
  });
}
