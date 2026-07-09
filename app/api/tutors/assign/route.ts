import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin links/unlinks an individual learner to a tutor (the "direct" roster).
// POST { tutorId, studentId, action: "add" | "remove" }.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { tutorId, studentId, action } = await req.json();
  if (!tutorId || !studentId) {
    return NextResponse.json({ error: "tutorId and studentId required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  if (action === "remove") {
    const { error } = await admin.from("teacher_students")
      .delete().eq("teacher_id", tutorId).eq("student_id", studentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, removed: true });
  }

  // Default = add. Confirm both parties exist with the right roles.
  const { data: tutor } = await admin.from("profiles").select("id, role").eq("id", tutorId).maybeSingle();
  if (tutor?.role !== "tutor") return NextResponse.json({ error: "Not a tutor" }, { status: 400 });

  const { error } = await admin.from("teacher_students")
    .upsert({ teacher_id: tutorId, student_id: studentId }, { onConflict: "teacher_id,student_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "tutor_student_linked", detail: { tutorId, studentId },
  });
  return NextResponse.json({ ok: true, added: true });
}
