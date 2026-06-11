import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

// POST { id, reason? }
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id, reason = "" } = await req.json();
  const admin = supabaseAdmin();
  const { data: app } = await admin.from("applications").select("*").eq("id", id).single();
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  await admin.from("applications")
    .update({ status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "reject_application", detail: { application_id: id, reason } });

  await sendEmail("rejected", app.email, { firstName: app.first_name, reason });
  return NextResponse.json({ ok: true });
}
