import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser, notifyAdmins } from "@/lib/notify";

// Send a direct message in a thread (thread key = the non-admin party's id).
// Works for every direction:
//  • admin → learner/tutor (body + studentId)  → recipient alerted via bell + push
//  • learner → admins       (body, self)        → admins alerted
//  • tutor → admins         (body, self)        → admins alerted
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
  // Optional voice note (uploaded via /api/messages/voice first).
  const audioUrl = String(payload?.audioUrl ?? "").trim();
  if (audioUrl && !/^https:\/\//.test(audioUrl)) {
    return NextResponse.json({ error: "Invalid voice note." }, { status: 400 });
  }
  if (!body && !audioUrl) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  const admin = supabaseAdmin();
  const preview = body ? (body.length > 120 ? `${body.slice(0, 117)}…` : body) : "🎤 Voice note";
  // Text-only messages omit audio_url entirely, so they still insert fine
  // before migration-voice-messages.sql has been run.
  const extra = audioUrl ? { audio_url: audioUrl } : {};

  if (me.role === "admin") {
    const studentId = String(payload?.studentId ?? "");
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const { data: message, error } = await admin.from("messages").insert({
      student_id: studentId, sender_id: user.id, sender_role: "admin", body, ...extra,
    }).select().single();
    if (error) {
      return NextResponse.json({
        error: /audio_url/i.test(error.message)
          ? "Voice notes need migration-voice-messages.sql — run it in Supabase."
          : error.message,
      }, { status: 500 });
    }

    // Point the recipient at their own thread (tutors have a different portal).
    const { data: recipient } = await admin.from("profiles").select("role").eq("id", studentId).maybeSingle();
    await notifyUser(admin, studentId, {
      title: "New message from D-Maths",
      body: preview,
      link: recipient?.role === "tutor" ? "/tutor/messages" : "/portal/messages",
    });
    return NextResponse.json({ ok: true, message });
  }

  // Learner or tutor replying / starting a message → their own thread; alert
  // admins. sender_role reuses 'student' for the non-admin party (thread owner).
  const { data: message, error } = await admin.from("messages").insert({
    student_id: user.id, sender_id: user.id, sender_role: "student", body, ...extra,
  }).select().single();
  if (error) {
    return NextResponse.json({
      error: /audio_url/i.test(error.message)
        ? "Voice notes need migration-voice-messages.sql — run it in Supabase."
        : error.message,
    }, { status: 500 });
  }

  const who = me.role === "tutor" ? "tutor" : "learner";
  await notifyAdmins(admin, {
    title: `New message from ${me.first_name ?? `a ${who}`}`,
    body: preview,
    link: me.role === "tutor" ? `/admin/tutors?t=${user.id}` : `/admin/students/${user.id}`,
  });
  return NextResponse.json({ ok: true, message });
}
