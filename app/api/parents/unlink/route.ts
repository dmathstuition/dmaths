import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, parentId } = await req.json();
  if (!studentId || !parentId) {
    return NextResponse.json({ error: "studentId and parentId required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  await admin.from("parent_student_links")
    .delete()
    .eq("parent_id", parentId)
    .eq("student_id", studentId);

  await admin.from("audit_log").insert({ actor_id: user.id, action: "parent_unlinked", detail: { parentId, studentId } });

  return NextResponse.json({ ok: true });
}
