import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// POST { id, action: "fulfill" | "reject", note? } — an admin resolves a
// pending redemption. Rejecting refunds the learner (its cost stops counting
// against their spendable balance).
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, action, note } = await req.json().catch(() => ({}));
  if (!id || (action !== "fulfill" && action !== "reject")) {
    return NextResponse.json({ error: "id and action (fulfill|reject) required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: red } = await admin.from("reward_redemptions").select("id, status, student_id, title, cost").eq("id", id).maybeSingle();
  if (!red) return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
  if (red.status !== "pending") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  const status = action === "fulfill" ? "fulfilled" : "rejected";
  const { error } = await admin.from("reward_redemptions").update({
    status, resolved_at: new Date().toISOString(), resolved_by: user.id,
    note: String(note || "").slice(0, 300),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: user.id, action: `reward_${status}`,
    detail: { redemptionId: id, studentId: red.student_id, title: red.title, cost: red.cost },
  });

  return NextResponse.json({ ok: true });
}
