import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff, staffCanAccessStudent } from "@/lib/authRole";
import { resolveRecipientIds, type Audience } from "@/lib/broadcast";
import { notifyUser } from "@/lib/notify";

// Staff post a "Task of the day" to a learner / class / level / subject / everyone.
// One row per targeted learner (grouped by batch_id), plus a push + bell each.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const payload = await req.json().catch(() => null);
  const type = String(payload?.type ?? "");
  const value = String(payload?.value ?? "");
  const title = String(payload?.title ?? "").trim().slice(0, 160);
  const details = String(payload?.details ?? "").trim().slice(0, 2000);
  if (!title) return NextResponse.json({ error: "A task title is required." }, { status: 400 });
  if (!["student", "all", "level", "subject", "class"].includes(type)) {
    return NextResponse.json({ error: "Choose who to send the task to." }, { status: 400 });
  }
  if (type !== "all" && !value) return NextResponse.json({ error: "Choose a target for that audience." }, { status: 400 });

  const admin = supabaseAdmin();

  // Resolve recipients.
  let ids: string[] = type === "student" ? [value] : await resolveRecipientIds(admin, type as Audience, value);

  // Tutors may only task learners in their roster.
  if (staff.role === "tutor") {
    const allowed: string[] = [];
    for (const sid of ids) if (await staffCanAccessStudent(staff, sid)) allowed.push(sid);
    ids = allowed;
  }
  ids = ids.slice(0, 2000);
  if (!ids.length) return NextResponse.json({ error: "No learners match that audience." }, { status: 400 });

  const batchId = crypto.randomUUID();
  const rows = ids.map((sid) => ({ student_id: sid, title, details, batch_id: batchId, created_by: staff.id }));
  const { error } = await admin.from("daily_tasks").insert(rows);
  if (error) {
    const msg = /relation .*daily_tasks.* does not exist/i.test(error.message)
      ? "Task of the day needs migration-daily-tasks.sql — run it in Supabase." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const preview = title.length > 120 ? `${title.slice(0, 117)}…` : title;
  await Promise.allSettled(ids.map((sid) =>
    notifyUser(admin, sid, { title: "📌 Task of the day", body: preview, link: "/portal" })));

  return NextResponse.json({ ok: true, created: ids.length, batchId });
}

// Withdraw an unfinished batch (admin only).
export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const batchId = new URL(req.url).searchParams.get("batchId");
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
  const { error } = await supabaseAdmin().from("daily_tasks").delete().eq("batch_id", batchId).eq("done", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
