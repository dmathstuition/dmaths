import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date");

  if (!classId || !date) return NextResponse.json({ error: "classId and date required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: records } = await admin
    .from("attendance_records")
    .select("student_id, present")
    .eq("class_id", classId)
    .eq("session_date", date);

  return NextResponse.json({ records: records ?? [] });
}
