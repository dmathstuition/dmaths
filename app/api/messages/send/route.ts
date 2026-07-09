import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser, notifyAdmins } from "@/lib/notify";
import { staffCanAccessStudent } from "@/lib/authRole";

// Send a direct message. Threads are keyed by (student_id, tutor_id):
//  • admin → learner/tutor   (studentId, tutor_id NULL)  → admin thread
//  • learner/tutor → admins  (self, tutor_id NULL)       → admin thread
//  • tutor → learner         (studentId, tutor_id=self)  → learner↔tutor thread
//  • learner → tutor         (tutorId, tutor_id=tutor)   → learner↔tutor thread
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role, first_name, last_name").eq("id", user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "student" && me.role !== "tutor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 2000);
  const audioUrl = String(payload?.audioUrl ?? "").trim();
  if (audioUrl && !/^https:\/\//.test(audioUrl)) {
    return NextResponse.json({ error: "Invalid voice note." }, { status: 400 });
  }
  if (!body && !audioUrl) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  const admin = supabaseAdmin();
  const preview = body ? (body.length > 120 ? `${body.slice(0, 117)}…` : body) : "🎤 Voice note";
  const extra = audioUrl ? { audio_url: audioUrl } : {};
  const studentId = String(payload?.studentId ?? "");
  const tutorId = String(payload?.tutorId ?? "");

  // Turn an insert error into a helpful, migration-aware message.
  const explain = (msg: string) =>
    /audio_url/i.test(msg) ? "Voice notes need migration-voice-messages.sql — run it in Supabase."
      : /tutor_id/i.test(msg) ? "Learner↔tutor messaging needs migration-tutor-messages.sql — run it in Supabase."
        : msg;

  async function insert(row: Record<string, any>) {
    return admin.from("messages").insert({ sender_id: user!.id, body, ...extra, ...row }).select().single();
  }

  // ── Admin → learner/tutor (admin thread) ──────────────────────────
  if (me.role === "admin") {
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });
    const { data: message, error } = await insert({ student_id: studentId, sender_role: "admin" });
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    const { data: recipient } = await admin.from("profiles").select("role").eq("id", studentId).maybeSingle();
    await notifyUser(admin, studentId, {
      title: "New message from D-Maths", body: preview,
      link: recipient?.role === "tutor" ? "/tutor/messages" : "/portal/messages",
    });
    return NextResponse.json({ ok: true, message });
  }

  // ── Tutor → learner (learner↔tutor thread) ────────────────────────
  if (me.role === "tutor" && studentId) {
    if (!(await staffCanAccessStudent({ id: user.id, role: "tutor" }, studentId))) {
      return NextResponse.json({ error: "That learner isn't in your roster." }, { status: 403 });
    }
    const { data: message, error } = await insert({ student_id: studentId, tutor_id: user.id, sender_role: "tutor" });
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await notifyUser(admin, studentId, { title: `New message from your tutor`, body: preview, link: "/portal/messages" });
    return NextResponse.json({ ok: true, message });
  }

  // ── Learner → tutor (learner↔tutor thread) ────────────────────────
  if (me.role === "student" && tutorId) {
    if (!(await staffCanAccessStudent({ id: tutorId, role: "tutor" }, user.id))) {
      return NextResponse.json({ error: "That isn't one of your tutors." }, { status: 403 });
    }
    const { data: message, error } = await insert({ student_id: user.id, tutor_id: tutorId, sender_role: "student" });
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    await notifyUser(admin, tutorId, { title: `New message from ${me.first_name ?? "a learner"}`, body: preview, link: `/tutor/learners/${user.id}` });
    return NextResponse.json({ ok: true, message });
  }

  // ── Learner/tutor → admins (admin thread) ─────────────────────────
  const { data: message, error } = await insert({ student_id: user.id, sender_role: "student" });
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  const who = me.role === "tutor" ? "tutor" : "learner";
  await notifyAdmins(admin, {
    title: `New message from ${me.first_name ?? `a ${who}`}`,
    body: preview,
    link: me.role === "tutor" ? `/admin/tutors?t=${user.id}` : `/admin/students/${user.id}`,
  });
  return NextResponse.json({ ok: true, message });
}
