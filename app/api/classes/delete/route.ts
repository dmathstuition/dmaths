import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin: permanently delete a class and everything tied to it (roster +
// attendance), even if its attendance was locked. Runs as the service role and
// unlocks the class first so the "attendance locked" trigger permits removing
// the rows — the same technique used when deleting a learner.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { classId } = await req.json().catch(() => ({}));
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const admin = supabaseAdmin();
  await admin.from("classes").update({ attendance_locked: false }).eq("id", classId);
  await admin.from("attendance_records").delete().eq("class_id", classId);
  await admin.from("class_students").delete().eq("class_id", classId);
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "class_deleted", detail: { classId },
  });
  return NextResponse.json({ ok: true });
}
