import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function recomputeTotals(admin: ReturnType<typeof supabaseAdmin>, studentId: string) {
  const { data: logRows } = await admin
    .from("behavior_logs")
    .select("behavior_type_id")
    .eq("student_id", studentId);

  let rewardPoints = 0;
  let sanctionPoints = 0;

  if (logRows && logRows.length > 0) {
    const uniqueTypeIds = [...new Set(logRows.map((l: any) => l.behavior_type_id))];
    const { data: typeRows } = await admin
      .from("behavior_types")
      .select("id, points")
      .in("id", uniqueTypeIds);

    const pointsMap: Record<string, number> = {};
    for (const t of typeRows ?? []) pointsMap[(t as any).id] = (t as any).points;

    for (const l of logRows) {
      const pts = pointsMap[(l as any).behavior_type_id] ?? 0;
      if (pts > 0) rewardPoints += pts;
      else sanctionPoints += pts;
    }
  }

  await admin.from("profiles").update({ reward_points: rewardPoints, sanction_points: sanctionPoints }).eq("id", studentId);
  return { rewardPoints, sanctionPoints };
}

export async function DELETE(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { logId } = await req.json();
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: existing } = await admin.from("behavior_logs").select("student_id").eq("id", logId).single();
  if (!existing) return NextResponse.json({ error: "Log entry not found" }, { status: 404 });

  const { error } = await admin.from("behavior_logs").delete().eq("id", logId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({ actor_id: user.id, action: "delete_behaviour_log", detail: { logId, studentId: existing.student_id } });

  const totals = await recomputeTotals(admin, existing.student_id);
  return NextResponse.json({ ok: true, ...totals });
}

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

  // Recompute denormalised totals — two plain queries avoids FK-join cache issues
  const { data: logRows } = await admin
    .from("behavior_logs")
    .select("behavior_type_id")
    .eq("student_id", studentId);

  let rewardPoints = 0;
  let sanctionPoints = 0;

  if (logRows && logRows.length > 0) {
    const uniqueTypeIds = [...new Set(logRows.map(l => l.behavior_type_id))];
    const { data: typeRows } = await admin
      .from("behavior_types")
      .select("id, points")
      .in("id", uniqueTypeIds);

    const pointsMap: Record<string, number> = {};
    for (const t of typeRows ?? []) pointsMap[t.id] = t.points;

    for (const l of logRows) {
      const pts = pointsMap[l.behavior_type_id] ?? 0;
      if (pts > 0) rewardPoints += pts;
      else sanctionPoints += pts;
    }
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
