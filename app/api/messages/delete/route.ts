import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Delete a single message. Admins can delete any message; a learner can delete
// messages within their own thread. (The messages table has no delete RLS
// policy, so this runs through the service role after an explicit check.)
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: msg } = await admin.from("messages").select("id, student_id").eq("id", id).single();
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = me?.role === "admin" || msg.student_id === user.id;
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await admin.from("messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
