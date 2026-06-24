import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentId, sessionDate, present } = await req.json();
  if (!classId || !studentId || !sessionDate || typeof present !== "boolean") {
    return NextResponse.json({ error: "classId, studentId, sessionDate and present required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("attendance_records").upsert(
    { class_id: classId, student_id: studentId, session_date: sessionDate, present },
    { onConflict: "class_id,student_id,session_date" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
