import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, gradeTarget } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const target = gradeTarget === null || gradeTarget === "" ? null : Number(gradeTarget);
  if (target !== null && (isNaN(target) || target < 0 || target > 100)) {
    return NextResponse.json({ error: "gradeTarget must be 0–100" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update({ grade_target: target }).eq("id", studentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({ actor_id: user.id, action: "set_grade_target", detail: { studentId, gradeTarget: target } });
  return NextResponse.json({ ok: true });
}
