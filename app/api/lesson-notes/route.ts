import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, staffCanAccessClass } from "@/lib/authRole";

// Staff-only lesson log. Admins log any class; tutors only their own.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const classId = String(payload?.classId ?? "");
  const topic = String(payload?.topic ?? "").trim().slice(0, 160);
  const notes = String(payload?.notes ?? "").trim().slice(0, 4000);
  const homework = String(payload?.homework ?? "").trim().slice(0, 1000);
  const taughtOn = String(payload?.taughtOn ?? "").trim() || new Date().toISOString().slice(0, 10);
  if (!classId || !topic) return NextResponse.json({ error: "A class and a topic are required." }, { status: 400 });
  if (!(await staffCanAccessClass(staff, classId))) {
    return NextResponse.json({ error: "That class isn't assigned to you." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data: cls } = await admin.from("classes").select("subject").eq("id", classId).maybeSingle();

  const { data: note, error } = await admin.from("lesson_notes")
    .insert({ class_id: classId, subject: cls?.subject ?? "", topic, notes, homework, taught_on: taughtOn, author_id: staff.id })
    .select().single();
  if (error) {
    const msg = /relation .*lesson_notes.* does not exist/i.test(error.message)
      ? "Lesson log needs migration-lesson-notes.sql — run it in Supabase." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, note });
}

export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  // Tutors may only delete their own entries; admins delete any.
  const { data: existing } = await admin.from("lesson_notes").select("author_id").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json({ ok: true });
  if (staff.role !== "admin" && existing.author_id !== staff.id) {
    return NextResponse.json({ error: "You can only delete your own entries." }, { status: 403 });
  }

  const { error } = await admin.from("lesson_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
