import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, getRoster } from "@/lib/authRole";
import { notifyUser } from "@/lib/notify";
import { presetByKey } from "@/lib/mockExam";
import { canStart } from "@/lib/mockRequests";

// Mock-exam request → authorize workflow. Learners request; staff approve
// (optionally scheduling a start time), decline, or launch a mock directly to
// chosen learners. All writes are service-role; RLS only exposes reads.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*mock_requests/i.test(m)
    ? "Mock requests need migration-mock-requests.sql — run it in Supabase."
    : m;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

// GET — staff see the whole queue (with learner names); a learner sees their own
// requests, each with a `startable` flag.
export async function GET() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  const admin = supabaseAdmin();
  const cols = "id, student_id, subject, preset, level, status, scheduled_for, note, created_at";

  if (me?.role === "admin" || me?.role === "tutor") {
    let q = admin.from("mock_requests").select(cols).order("created_at", { ascending: false }).limit(200);
    if (me.role === "tutor") {
      // Tutors only see requests from learners on their own roster.
      const roster = await getRoster(user.id);
      q = q.in("student_id", roster.length ? roster : ["00000000-0000-0000-0000-000000000000"]);
    }
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: explain(error.message), requests: [], staff: true }, { status: 200 });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.student_id)));
    const { data: studs } = ids.length
      ? await admin.from("profiles").select("id, first_name, last_name, student_code").in("id", ids)
      : { data: [] as any[] };
    const nameOf = new Map((studs ?? []).map((s: any) => [s.id, s]));
    const requests = (data ?? []).map((r: any) => ({ ...r, student: nameOf.get(r.student_id) ?? null }));
    return NextResponse.json({ requests, staff: true });
  }
  if (me?.role !== "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin.from("mock_requests").select(cols).eq("student_id", user.id).order("created_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: explain(error.message), requests: [] }, { status: 200 });
  return NextResponse.json({ requests: (data ?? []).map((r: any) => ({ ...r, startable: canStart(r) })) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const admin = supabaseAdmin();
  const stamp = () => new Date().toISOString();

  // ── Learner: create a request ──────────────────────────────────
  if (action === "request") {
    const supa = supabaseServer();
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: me } = await supa.from("profiles").select("role, level").eq("id", user.id).single();
    if (me?.role !== "student") return NextResponse.json({ error: "Learners only" }, { status: 403 });

    const subject = String(body?.subject ?? "").trim().slice(0, 80);
    const preset = presetByKey(String(body?.preset ?? "")).key;

    const { data: pend } = await admin.from("mock_requests").select("id").eq("student_id", user.id).eq("status", "pending").limit(1);
    if (pend?.length) return NextResponse.json({ error: "You already have a request awaiting approval." }, { status: 409 });

    // The learner's exam target (best-effort — the column may not be migrated).
    const { data: et } = await admin.from("profiles").select("exam_target").eq("id", user.id).single();
    const exam = (et as any)?.exam_target ?? "";

    const insertRow: Record<string, any> = { student_id: user.id, subject, preset, level: (me as any).level ?? "", status: "pending", exam };
    const cols = "id, subject, preset, level, status, scheduled_for, created_at";
    let { data, error } = await admin.from("mock_requests").insert(insertRow).select(cols).single();
    if (error && /column .*exam/i.test(error.message)) {
      delete insertRow.exam;
      ({ data, error } = await admin.from("mock_requests").insert(insertRow).select(cols).single());
    }
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, request: { ...data, startable: false } });
  }

  // ── Staff: approve / decline / launch ──────────────────────────
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Staff only" }, { status: 403 });

  if (action === "approve") {
    const id = String(body?.id ?? "");
    const scheduledFor = body?.scheduledFor ? new Date(body.scheduledFor).toISOString() : null;
    const { data: r } = await admin.from("mock_requests").select("student_id, subject").eq("id", id).maybeSingle();
    if (!r) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    const { error } = await admin.from("mock_requests")
      .update({ status: "approved", scheduled_for: scheduledFor, resolved_at: stamp(), resolved_by: staff.id }).eq("id", id);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await notifyUser(admin, r.student_id, {
      title: "✅ Mock exam approved",
      body: scheduledFor ? `Your ${r.subject || "mock"} exam is approved — it opens ${fmt(scheduledFor)}.` : `Your ${r.subject || "mock"} exam is approved — you can start it now.`,
      link: "/portal/mock-exam",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    const id = String(body?.id ?? "");
    const note = String(body?.note ?? "").slice(0, 300);
    const { data: r } = await admin.from("mock_requests").select("student_id, subject").eq("id", id).maybeSingle();
    if (!r) return NextResponse.json({ error: "Request not found." }, { status: 404 });
    const { error } = await admin.from("mock_requests")
      .update({ status: "declined", note, resolved_at: stamp(), resolved_by: staff.id }).eq("id", id);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await notifyUser(admin, r.student_id, {
      title: "Mock exam request declined",
      body: note || "Your mock request wasn't approved this time — ask your tutor for details.",
      link: "/portal/mock-exam",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "launch") {
    let studentIds = Array.isArray(body?.studentIds) ? body.studentIds.map(String).slice(0, 200) : [];
    // A tutor can only launch to learners on their own roster.
    if (staff.role === "tutor") {
      const roster = new Set(await getRoster(staff.id));
      studentIds = studentIds.filter((id: string) => roster.has(id));
    }
    const subject = String(body?.subject ?? "").trim().slice(0, 80);
    const preset = presetByKey(String(body?.preset ?? "")).key;
    const scheduledFor = body?.scheduledFor ? new Date(body.scheduledFor).toISOString() : null;
    if (!studentIds.length) return NextResponse.json({ error: "Pick at least one learner." }, { status: 400 });

    const { data: studs } = await admin.from("profiles").select("id, level").in("id", studentIds).eq("role", "student");
    const rows = (studs ?? []).map((s: any) => ({
      student_id: s.id, subject, preset, level: s.level ?? "", status: "approved",
      scheduled_for: scheduledFor, resolved_at: stamp(), resolved_by: staff.id,
    }));
    if (!rows.length) return NextResponse.json({ error: "None of those learners were found." }, { status: 400 });

    const { error } = await admin.from("mock_requests").insert(rows);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await Promise.allSettled(rows.map((r) => notifyUser(admin, r.student_id, {
      title: "📝 A mock exam was set for you",
      body: scheduledFor ? `A ${subject || "mock"} exam opens ${fmt(scheduledFor)}.` : `Your teacher set you a ${subject || "mock"} exam — start it now.`,
      link: "/portal/mock-exam",
    })));
    return NextResponse.json({ ok: true, count: rows.length });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
