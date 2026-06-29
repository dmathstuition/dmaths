import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Admin-only: mark a part-payment's balance as settled (and record it in the
// audit log). Replaces the previous client-side update so the action is
// attributable in /admin/activity.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: app } = await admin.from("applications").select("first_name,last_name").eq("id", id).single();
  await admin.from("applications").update({ pay_plan: "full" }).eq("id", id);
  await admin.from("audit_log").insert({
    actor_id: user.id, action: "balance_marked_paid",
    detail: { id, name: app ? `${app.first_name} ${app.last_name}`.trim() : "" },
  });

  return NextResponse.json({ ok: true });
}
