import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, behaviorTypeId, notes = "" } = await req.json();
  if (!studentId || !behaviorTypeId) {
    return NextResponse.json({ error: "studentId and behaviorTypeId required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: btype } = await admin.from("behavior_types")
    .select("name, category, points").eq("id", behaviorTypeId).eq("is_active", true).single();
  if (!btype) return NextResponse.json({ error: "Behaviour type not found" }, { status: 404 });

  const { error } = await admin.from("behavior_logs").insert({
    student_id: studentId,
    behavior_type_id: behaviorTypeId,
    notes: String(notes).slice(0, 500) || null,
    logged_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute denormalised totals from DB
  const { data: totals } = await admin
    .from("behavior_logs")
    .select("behavior_type:behavior_types(points)")
    .eq("student_id", studentId);

  let rewardPoints = 0;
  let sanctionPoints = 0;
  for (const row of totals ?? []) {
    const pts = (row.behavior_type as any)?.points ?? 0;
    if (pts > 0) rewardPoints += pts;
    else sanctionPoints += pts;
  }

  await admin.from("profiles").update({ reward_points: rewardPoints, sanction_points: sanctionPoints }).eq("id", studentId);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "log_behaviour", detail: { studentId, behaviorTypeId, points: btype.points } });
  await admin.from("notifications").insert({
    user_id: studentId,
    title: btype.category === "positive" ? `+${btype.points} pts — ${btype.name}` : `${btype.points} pts — ${btype.name}`,
    body: notes || null,
    link: "/portal/behavior",
  });

  return NextResponse.json({ ok: true, rewardPoints, sanctionPoints });
}
