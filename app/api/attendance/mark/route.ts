import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, staffCanAccessClass } from "@/lib/authRole";

export async function POST(req: Request) {
  // Admins mark any class; tutors only their own.
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, studentId, sessionDate, present } = await req.json();
  if (!classId || !studentId || !sessionDate || typeof present !== "boolean") {
    return NextResponse.json({ error: "classId, studentId, sessionDate and present required" }, { status: 400 });
  }
  if (!(await staffCanAccessClass(staff, classId))) {
    return NextResponse.json({ error: "That class isn't assigned to you." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("attendance_records").upsert(
    { class_id: classId, student_id: studentId, session_date: sessionDate, present },
    { onConflict: "class_id,student_id,session_date" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
