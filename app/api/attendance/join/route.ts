import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Called when a student clicks "Join class". Records a provisional
// present=true, self_marked=true so the admin can later confirm whether
// the student actually stayed for the session.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const admin = supabaseAdmin();

  // Don't touch attendance that's already been finalised/locked by the admin.
  const { data: cls } = await admin.from("classes").select("attendance_locked").eq("id", classId).single();
  if (cls?.attendance_locked) return NextResponse.json({ ok: true, locked: true });

  // Only allow if the student is on this class roster.
  const { data: roster } = await admin.from("class_students")
    .select("student_id").eq("class_id", classId).eq("student_id", user.id).maybeSingle();
  if (!roster) return NextResponse.json({ error: "Not enrolled in this class" }, { status: 403 });

  await admin.from("attendance_records").upsert({
    class_id: classId, student_id: user.id, present: true,
    self_marked: true, joined_at: new Date().toISOString(),
  }, { onConflict: "class_id,student_id,session_date" });

  return NextResponse.json({ ok: true });
}
