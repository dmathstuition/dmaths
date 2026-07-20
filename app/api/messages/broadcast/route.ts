import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { rateLimit } from "@/lib/ratelimit";

// Admin-only: send a direct message (+ push) to a whole audience at once.
// Each recipient gets a normal row in their admin message thread, so it shows
// up in /portal/messages exactly like a personal message.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!rateLimit(`broadcast:${user.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "You're sending broadcasts too fast — wait a moment." }, { status: 429 });
  }

  const payload = await req.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 2000);
  const type = String(payload?.type ?? "");        // 'all' | 'level' | 'subject' | 'class'
  const value = String(payload?.value ?? "");
  if (!body) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (!["all", "level", "subject", "class"].includes(type)) {
    return NextResponse.json({ error: "Choose who to send to." }, { status: 400 });
  }
  if (type !== "all" && !value) {
    return NextResponse.json({ error: "Choose a target for that audience." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Resolve recipient ids.
  let ids: string[] = [];
  if (type === "class") {
    const { data } = await admin.from("class_students").select("student_id").eq("class_id", value);
    const roster = (data ?? []).map((r: any) => r.student_id);
    if (roster.length) {
      const { data: active } = await admin.from("profiles").select("id")
        .in("id", roster).eq("role", "student").eq("is_active", true);
      ids = (active ?? []).map((r: any) => r.id);
    }
  } else {
    let q = admin.from("profiles").select("id").eq("role", "student").eq("is_active", true);
    if (type === "level") q = q.eq("level", value);
    if (type === "subject") q = q.contains("subjects", [value]);
    const { data } = await q;
    ids = (data ?? []).map((r: any) => r.id);
  }

  if (!ids.length) return NextResponse.json({ error: "No active students match that audience." }, { status: 400 });
  ids = ids.slice(0, 2000); // safety cap

  // Insert one message per recipient (admin thread).
  const rows = ids.map((sid) => ({ student_id: sid, sender_id: user.id, sender_role: "admin", body }));
  const { error } = await admin.from("messages").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify (in-app bell + push), best-effort.
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  await Promise.allSettled(
    ids.map((sid) => notifyUser(admin, sid, { title: "New message from D-Maths", body: preview, link: "/portal/messages" })),
  );

  return NextResponse.json({ ok: true, sent: ids.length });
}
