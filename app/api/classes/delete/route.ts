import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, staffCanAccessClass } from "@/lib/authRole";

// Admin: permanently delete a class and everything tied to it (roster +
// attendance), even if its attendance was locked. Runs as the service role and
// unlocks the class first so the "attendance locked" trigger permits removing
// the rows — the same technique used when deleting a learner.
export async function POST(req: Request) {
  // Admins delete any class; tutors only classes assigned to them.
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId, seriesId } = await req.json().catch(() => ({}));
  if (!classId && !seriesId) return NextResponse.json({ error: "classId or seriesId required" }, { status: 400 });

  const admin = supabaseAdmin();

  // Resolve the target class ids: a single class, or every class in a weekly series.
  let ids: string[] = [];
  if (seriesId) {
    const { data: cls } = await admin.from("classes").select("id").eq("series_id", seriesId);
    ids = (cls ?? []).map((c: { id: string }) => c.id);
  } else {
    ids = [classId];
  }
  if (!ids.length) return NextResponse.json({ ok: true });

  // Every resolved class must be within this staff member's reach.
  for (const id of ids) {
    if (!(await staffCanAccessClass(staff, id))) {
      return NextResponse.json({ error: "That class isn't yours." }, { status: 403 });
    }
  }

  // Unlock so the attendance-lock trigger permits removing the rows, then delete
  // attendance + roster + the class(es) themselves.
  await admin.from("classes").update({ attendance_locked: false }).in("id", ids);
  await admin.from("attendance_records").delete().in("class_id", ids);
  await admin.from("class_students").delete().in("class_id", ids);
  const { error } = await admin.from("classes").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: staff.id, action: "class_deleted", detail: seriesId ? { seriesId, count: ids.length } : { classId },
  });
  return NextResponse.json({ ok: true });
}
