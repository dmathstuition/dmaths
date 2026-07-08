import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";

// Admin attaches (or clears) a recording link on a class so learners can
// rewatch the lesson. When a link is set, everyone on the class roster is
// alerted (bell + push).
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const classId = String(payload?.classId ?? "");
  const url = String(payload?.url ?? "").trim();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Enter a full link starting with http:// or https://" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: cls } = await admin.from("classes").select("id, subject").eq("id", classId).single();
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const { error } = await admin.from("classes").update({ recording_url: url }).eq("id", classId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tell the roster a recording is ready (only when setting, not clearing).
  if (url) {
    const { data: roster } = await admin
      .from("class_students").select("student_id").eq("class_id", classId);
    for (const r of roster ?? []) {
      await notifyUser(admin, r.student_id, {
        title: "🎥 Class recording available",
        body: `${cls.subject} — tap to rewatch the lesson.`,
        link: "/portal/classes",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
