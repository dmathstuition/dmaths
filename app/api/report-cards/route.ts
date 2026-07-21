import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { staffCanAccessStudent } from "@/lib/authRole";

// Staff-only: issue or revoke a termly report card. Admins can issue for any
// student; tutors only for learners in their roster.
async function requireStaff() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin" && me?.role !== "tutor") return { error: "Forbidden", status: 403 as const };
  return { user, role: me.role as "admin" | "tutor" };
}

function makeSerial() {
  return `RC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const payload = await req.json().catch(() => null);
  const studentId = String(payload?.studentId ?? "");
  const classId = String(payload?.classId ?? "");
  const term = String(payload?.term ?? "").trim().slice(0, 80);
  const remark = String(payload?.remark ?? "").trim().slice(0, 600);
  if (!term) return NextResponse.json({ error: "A term/period is required." }, { status: 400 });
  if (!studentId && !classId) return NextResponse.json({ error: "Choose a student or a class." }, { status: 400 });

  const admin = supabaseAdmin();

  // Resolve recipients (single student, or a class roster).
  let ids: string[] = [];
  if (classId) {
    const { data: roster } = await admin.from("class_students").select("student_id").eq("class_id", classId);
    const rosterIds = (roster ?? []).map((r: any) => r.student_id);
    if (rosterIds.length) {
      const { data: active } = await admin.from("profiles").select("id")
        .in("id", rosterIds).eq("role", "student").eq("is_active", true);
      ids = (active ?? []).map((r: any) => r.id);
    }
    if (!ids.length) return NextResponse.json({ error: "That class has no active students." }, { status: 400 });
  } else {
    ids = [studentId];
  }

  // Tutors may only issue for learners in their roster.
  if (gate.role === "tutor") {
    for (const sid of ids) {
      if (!(await staffCanAccessStudent({ id: gate.user.id, role: "tutor" }, sid))) {
        return NextResponse.json({ error: "Some of those learners aren't in your roster." }, { status: 403 });
      }
    }
  }

  // Snapshot each student's current stats.
  const { data: profs } = await admin.from("profiles")
    .select("id, role, avg_score, attendance, reward_points, sanction_points").in("id", ids);
  const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));

  const rows = ids
    .map((sid) => byId.get(sid))
    .filter((p: any) => p && p.role === "student")
    .map((p: any) => ({
      student_id: p.id, term, remark, serial: makeSerial(), issued_by: gate.user.id,
      avg_score: p.avg_score ?? 0, attendance: p.attendance ?? 0,
      reward_points: p.reward_points ?? 0, sanction_points: p.sanction_points ?? 0,
    }));
  if (!rows.length) return NextResponse.json({ error: "No valid students to issue to." }, { status: 400 });

  const { data: cards, error } = await admin.from("report_cards").insert(rows).select("id, student_id");
  if (error) {
    const msg = /relation .*report_cards.* does not exist/i.test(error.message)
      ? "Report cards need migration-report-cards.sql — run it in Supabase." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await Promise.allSettled((cards ?? []).map((c: any) =>
    notifyUser(admin, c.student_id, {
      title: "📄 Your report card is ready",
      body: `${term} — tap to view and download it.`,
      link: `/report-card/${c.id}`,
    }),
  ));

  return NextResponse.json({ ok: true, issued: cards?.length ?? 0 });
}

export async function DELETE(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (gate.role !== "admin") return NextResponse.json({ error: "Only an admin can revoke a report card." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin().from("report_cards").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
