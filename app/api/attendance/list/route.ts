import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, staffCanAccessClass } from "@/lib/authRole";

export async function GET(req: Request) {
  // Admins read any class; tutors only their own.
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date");

  if (!classId || !date) return NextResponse.json({ error: "classId and date required" }, { status: 400 });
  if (!(await staffCanAccessClass(staff, classId))) {
    return NextResponse.json({ error: "That class isn't assigned to you." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const first = await admin
    .from("attendance_records")
    .select("student_id, present, late")
    .eq("class_id", classId)
    .eq("session_date", date);
  let records: any[] | null = first.data;
  // Fallback if migration-attendance-late.sql hasn't been run yet.
  if (first.error && /late/i.test(first.error.message)) {
    const fb = await admin
      .from("attendance_records").select("student_id, present")
      .eq("class_id", classId).eq("session_date", date);
    records = fb.data;
  }

  return NextResponse.json({ records: records ?? [] });
}
