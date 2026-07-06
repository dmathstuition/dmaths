import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser, notifyAdmins } from "@/lib/notify";

// Send a direct message in a learner's thread. Works for both directions:
//  • admin → learner   (body + studentId)  → learner alerted via bell + push
//  • learner → admins   (body, self)        → admins alerted via bell + push
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role, first_name, last_name").eq("id", user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "student")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 2000);
  if (!body) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });

  const admin = supabaseAdmin();
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;

  if (me.role === "admin") {
    const studentId = String(payload?.studentId ?? "");
    if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

    const { data: message, error } = await admin.from("messages").insert({
      student_id: studentId, sender_id: user.id, sender_role: "admin", body,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await notifyUser(admin, studentId, {
      title: "New message from D-Maths",
      body: preview,
      link: "/portal/messages",
    });
    return NextResponse.json({ ok: true, message });
  }

  // Learner replying / starting a message → their own thread; alert admins.
  const { data: message, error } = await admin.from("messages").insert({
    student_id: user.id, sender_id: user.id, sender_role: "student", body,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notifyAdmins(admin, {
    title: `New message from ${me.first_name ?? "a learner"}`,
    body: preview,
    link: `/admin/students/${user.id}`,
  });
  return NextResponse.json({ ok: true, message });
}
