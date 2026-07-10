import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { requireStaff, staffCanAccessClass } from "@/lib/authRole";

// The host of an in-portal live class flips its "live" state: set when they join
// (and refreshed by a heartbeat), cleared when they leave. Learners see a
// "LIVE now" badge while it's recent. On the first transition to live, the class
// roster is alerted (bell + push) so they can jump in.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const classId = String(payload?.classId ?? "");
  const live = Boolean(payload?.live);
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  if (!(await staffCanAccessClass(staff, classId))) {
    return NextResponse.json({ error: "That class isn't assigned to you." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data: cls } = await admin.from("classes").select("id, subject, live_since").eq("id", classId).single();
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // "Freshly going live" = it wasn't live, or the previous heartbeat is stale.
  const prev = (cls as any).live_since ? new Date((cls as any).live_since).getTime() : 0;
  const wasLive = prev > Date.now() - 3 * 60 * 1000;

  const { error } = await admin.from("classes")
    .update({ live_since: live ? new Date().toISOString() : null }).eq("id", classId);
  if (error) {
    return NextResponse.json(
      { error: /live_since/i.test(error.message) ? "Run migration-live-classes.sql in Supabase first." : error.message },
      { status: 500 },
    );
  }

  // Alert the roster only on the first go-live (not on every heartbeat).
  if (live && !wasLive) {
    const { data: roster } = await admin.from("class_students").select("student_id").eq("class_id", classId);
    for (const r of roster ?? []) {
      await notifyUser(admin, r.student_id, {
        title: "🔴 Class is live now",
        body: `${cls.subject} has started — tap to join in the app.`,
        link: "/portal/classes",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
