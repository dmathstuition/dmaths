import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { requireStaff, staffCanAccessStudent } from "@/lib/authRole";
import { sanctionFromPoints, rewardDeltaForLog, nextRewardTotal } from "@/lib/behaviourPoints";

async function awardPointsBadges(admin: ReturnType<typeof supabaseAdmin>, studentId: string, rewardPoints: number) {
  const [{ data: badges }, { data: earned }] = await Promise.all([
    admin.from("badges").select("id, name, description, points_threshold").not("points_threshold", "is", null),
    admin.from("student_badges").select("badge_id").eq("student_id", studentId),
  ]);
  const earnedIds = new Set((earned ?? []).map((e: any) => e.badge_id));
  const toAward = (badges ?? []).filter((b: any) => rewardPoints >= b.points_threshold && !earnedIds.has(b.id));
  for (const badge of toAward) {
    const { error } = await admin.from("student_badges").insert({ student_id: studentId, badge_id: badge.id });
    if (!error) {
      await notifyUser(admin, studentId, {
        title: `Badge unlocked: ${(badge as any).name}!`,
        body: (badge as any).description,
        link: "/portal/badges",
      });
    }
  }
}

// Re-sync a learner's behaviour totals. sanction_points is behaviour-only, so
// it's recomputed from the logs. reward_points is the SHARED running total
// (bonuses + positive behaviour), so it's only ADJUSTED by `rewardDelta` — never
// overwritten, which previously wiped every earned bonus point.
async function applyBehaviourTotals(admin: ReturnType<typeof supabaseAdmin>, studentId: string, rewardDelta: number) {
  const { data: logRows } = await admin
    .from("behavior_logs").select("behavior_type_id").eq("student_id", studentId);

  let allPoints: number[] = [];
  if (logRows && logRows.length > 0) {
    const uniqueTypeIds = [...new Set(logRows.map((l: any) => l.behavior_type_id))];
    const { data: typeRows } = await admin.from("behavior_types").select("id, points").in("id", uniqueTypeIds);
    const pointsMap: Record<string, number> = {};
    for (const t of typeRows ?? []) pointsMap[(t as any).id] = (t as any).points;
    allPoints = logRows.map((l: any) => pointsMap[l.behavior_type_id] ?? 0);
  }
  const sanctionPoints = sanctionFromPoints(allPoints);

  const { data: me } = await admin.from("profiles").select("reward_points").eq("id", studentId).single();
  const rewardPoints = nextRewardTotal(me?.reward_points ?? 0, rewardDelta);

  await admin.from("profiles").update({ reward_points: rewardPoints, sanction_points: sanctionPoints }).eq("id", studentId);
  return { rewardPoints, sanctionPoints };
}

export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { logId } = await req.json();
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

  const admin = supabaseAdmin();

  const { data: existing } = await admin.from("behavior_logs").select("student_id, behavior_type_id").eq("id", logId).single();
  if (!existing) return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
  if (!(await staffCanAccessStudent(staff, existing.student_id))) {
    return NextResponse.json({ error: "That learner isn't in your roster." }, { status: 403 });
  }

  // How much this log added to reward_points, so deleting it removes exactly that.
  const { data: bt } = await admin.from("behavior_types").select("points").eq("id", existing.behavior_type_id).single();
  const rewardDelta = -rewardDeltaForLog(bt?.points ?? 0);

  const { error } = await admin.from("behavior_logs").delete().eq("id", logId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({ actor_id: staff.id, action: "delete_behaviour_log", detail: { logId, studentId: existing.student_id } });

  const totals = await applyBehaviourTotals(admin, existing.student_id, rewardDelta);
  return NextResponse.json({ ok: true, ...totals });
}

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, behaviorTypeId, notes = "" } = await req.json();
  if (!studentId || !behaviorTypeId) {
    return NextResponse.json({ error: "studentId and behaviorTypeId required" }, { status: 400 });
  }
  if (!(await staffCanAccessStudent(staff, studentId))) {
    return NextResponse.json({ error: "That learner isn't in your roster." }, { status: 403 });
  }

  const admin = supabaseAdmin();

  const { data: btype } = await admin.from("behavior_types")
    .select("name, category, points").eq("id", behaviorTypeId).eq("is_active", true).single();
  if (!btype) return NextResponse.json({ error: "Behaviour type not found" }, { status: 404 });

  const { error } = await admin.from("behavior_logs").insert({
    student_id: studentId,
    behavior_type_id: behaviorTypeId,
    notes: String(notes).slice(0, 500) || null,
    logged_by: staff.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A positive behaviour ADDS to the shared reward total; a negative one is a
  // sanction only. reward_points is never overwritten, so bonuses survive.
  const { rewardPoints, sanctionPoints } = await applyBehaviourTotals(admin, studentId, rewardDeltaForLog(btype.points));
  await awardPointsBadges(admin, studentId, rewardPoints);
  await admin.from("audit_log").insert({ actor_id: staff.id, action: "log_behaviour", detail: { studentId, behaviorTypeId, points: btype.points } });
  await notifyUser(admin, studentId, {
    title: btype.category === "positive" ? `+${btype.points} pts — ${btype.name}` : `${btype.points} pts — ${btype.name}`,
    body: notes || undefined,
    link: "/portal/behavior",
  });

  return NextResponse.json({ ok: true, rewardPoints, sanctionPoints });
}
