import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// A learner marks their OWN task of the day done (with an optional note).
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  const id = String(payload?.id ?? "");
  const response = String(payload?.response ?? "").trim().slice(0, 2000);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: task } = await admin.from("daily_tasks").select("id, student_id, done").eq("id", id).maybeSingle();
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  if (task.student_id !== user.id) return NextResponse.json({ error: "That isn't your task." }, { status: 403 });
  if (task.done) return NextResponse.json({ ok: true });

  const { error } = await admin.from("daily_tasks")
    .update({ done: true, done_at: new Date().toISOString(), response }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
