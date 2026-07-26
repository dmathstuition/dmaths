import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, getRoster, staffCanAccessClass } from "@/lib/authRole";
import { detectClashes } from "@/lib/clashLookup";

// Staff create/update a class. Tutors may only schedule their OWN classes and
// may only add learners already in their roster — the admin still decides who a
// tutor teaches; the tutor decides when. Runs as the service role, so every one
// of those rules is enforced here rather than trusted from the client.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const b = await req.json().catch(() => null);
  const classId = String(b?.classId ?? "");
  const subject = String(b?.subject ?? "").trim().slice(0, 80);
  const startsAt = String(b?.startsAt ?? "").trim();
  const duration = Math.min(300, Math.max(15, Math.round(Number(b?.durationMinutes) || 60)));
  const mode = b?.mode === "physical" ? "physical" : "online";
  const platform = String(b?.platform ?? "Zoom").trim().slice(0, 40);
  const location = String(b?.location ?? "").trim().slice(0, 200);
  const link = String(b?.link ?? "").trim().slice(0, 500);
  const studentIds: string[] = Array.isArray(b?.studentIds) ? b.studentIds.map(String) : [];

  if (!subject || !startsAt) {
    return NextResponse.json({ error: "A subject and a start time are required." }, { status: 400 });
  }
  const start = new Date(startsAt);
  if (isNaN(start.getTime())) return NextResponse.json({ error: "That start time isn't valid." }, { status: 400 });

  const admin = supabaseAdmin();

  // A tutor may only attach learners they already teach.
  if (staff.role === "tutor" && studentIds.length) {
    const roster = new Set(await getRoster(staff.id));
    if (studentIds.some((id) => !roster.has(id))) {
      return NextResponse.json({ error: "You can only add learners from your own roster." }, { status: 403 });
    }
  }

  // Tutors are pinned to themselves; admins may assign any tutor.
  let tutorId: string | null = staff.role === "tutor" ? staff.id : (b?.tutorId ? String(b.tutorId) : null);
  let tutorName = String(b?.tutor ?? "").trim().slice(0, 80);
  if (staff.role === "tutor") {
    const { data: me } = await admin.from("profiles").select("first_name, last_name").eq("id", staff.id).maybeSingle();
    tutorName = `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim() || "Tutor";
  }

  const base = {
    subject, tutor: tutorName, platform: mode === "physical" ? "In-person" : platform,
    duration_minutes: duration, link: mode === "physical" ? "" : link,
    ...(tutorId ? { tutor_id: tutorId } : {}),
    ...(mode === "physical" ? { mode, location } : { mode }),
  };

  const explain = (m: string) =>
    /tutor_id|mode|location/i.test(m) ? "This needs the tutor/physical-class migrations — run them in Supabase." : m;

  // How many occurrences we're about to book (1, or a weekly series).
  const weeks = classId ? 1 : (b?.repeatWeekly ? Math.min(26, Math.max(2, Math.round(Number(b?.repeatWeeks) || 8))) : 1);
  const slots = Array.from({ length: weeks }).map((_, i) => ({
    startsAt: new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    durationMinutes: duration,
    tutorId,
    studentIds,
  }));

  // ── Double-booking check ──────────────────────────────────────────
  // A warning, not a veto: the scheduler may know something we don't, so they
  // can re-send with confirm:true. Every occurrence of a series is checked, not
  // just the first.
  if (!b?.confirm) {
    const clashes = await detectClashes(admin, slots, classId ? [classId] : []);
    if (clashes.length) {
      return NextResponse.json({
        error: "That time is already booked.",
        clashes,
        needsConfirm: true,
      }, { status: 409 });
    }
  }

  // ── Update an existing class ──────────────────────────────────────
  if (classId) {
    if (!(await staffCanAccessClass(staff, classId))) {
      return NextResponse.json({ error: "That class isn't yours." }, { status: 403 });
    }
    const { error } = await admin.from("classes").update({ ...base, starts_at: start.toISOString() }).eq("id", classId);
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });

    await admin.from("class_students").delete().eq("class_id", classId);
    if (studentIds.length) {
      await admin.from("class_students").insert(studentIds.map((sid) => ({ class_id: classId, student_id: sid })));
    }
    return NextResponse.json({ ok: true, updated: 1 });
  }

  // ── Create (optionally a weekly series) ───────────────────────────
  const seriesId = weeks > 1 ? crypto.randomUUID() : null;
  const rows = slots.map((s) => ({
    ...base,
    starts_at: s.startsAt,
    ...(seriesId ? { series_id: seriesId } : {}),
  }));

  const { data: created, error } = await admin.from("classes").insert(rows).select("id");
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });

  if (studentIds.length && created?.length) {
    const links = created.flatMap((c: any) => studentIds.map((sid) => ({ class_id: c.id, student_id: sid })));
    await admin.from("class_students").insert(links);
  }

  return NextResponse.json({ ok: true, created: created?.length ?? 0 });
}
