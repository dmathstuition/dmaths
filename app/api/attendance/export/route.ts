import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin-only: download a class's attendance register as CSV — a grid of learners ×
// session dates, each cell Present / Late / Absent. Range defaults to the single
// given date; pass from/to for a week or month.
export const dynamic = "force-dynamic";

const csvCell = (v: string) => `"${String(v).replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") || searchParams.get("date") || today;
  const to = searchParams.get("to") || searchParams.get("date") || from;

  const admin = supabaseAdmin();
  const { data: cls } = await admin.from("classes").select("subject, mode, location").eq("id", classId).single();
  const { data: rosterRows } = await admin.from("class_students")
    .select("student_id, student:profiles(first_name, last_name)").eq("class_id", classId);

  // Records in range (with a fallback if the `late` column isn't there yet).
  const recs = await admin.from("attendance_records").select("student_id, session_date, present, late")
    .eq("class_id", classId).gte("session_date", from).lte("session_date", to);
  let records: any[] = recs.data ?? [];
  if (recs.error && /late/i.test(recs.error.message)) {
    const fb = await admin.from("attendance_records").select("student_id, session_date, present")
      .eq("class_id", classId).gte("session_date", from).lte("session_date", to);
    records = fb.data ?? [];
  }

  const roster = (rosterRows ?? []).map((r: any) => ({
    id: r.student_id,
    name: `${r.student?.first_name ?? ""} ${r.student?.last_name ?? ""}`.trim() || "Learner",
  })).sort((a, b) => a.name.localeCompare(b.name));

  const dates = Array.from(new Set(records.map((r: any) => r.session_date))).sort();
  const key = (sid: string, d: string) => `${sid}|${d}`;
  const byCell = new Map<string, any>();
  for (const r of records as any[]) byCell.set(key(r.student_id, r.session_date), r);

  const status = (r: any | undefined) => (!r ? "" : r.present ? (r.late ? "Late" : "Present") : "Absent");

  const header = ["Student", ...dates].map(csvCell).join(",");
  const body = roster.map((s) =>
    [s.name, ...dates.map((d) => status(byCell.get(key(s.id, d))))].map(csvCell).join(","),
  );
  const csv = [header, ...body].join("\r\n") + "\r\n";

  const safe = (cls?.subject || "class").replace(/[^\w-]+/g, "_");
  const filename = `attendance-${safe}-${from}${to !== from ? `_${to}` : ""}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
