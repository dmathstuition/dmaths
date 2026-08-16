import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/notify";
import { sanitizeProfileEdit } from "@/lib/profileEdit";

// A learner updates their own profile — a safe subset only (class/year group,
// school, contact + guardian details). The id always comes from the session, so
// one learner can never edit another. Changing the class is surfaced to admins,
// since it affects which classes/mocks the learner is matched to.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles")
    .select("role, level, first_name, last_name, student_code").eq("id", user.id).single();
  if (me?.role !== "student") return NextResponse.json({ error: "Learners only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const { patch, error: bad } = sanitizeProfileEdit(body);
  if (!patch) return NextResponse.json({ error: bad }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Let staff know when a learner corrects their class, so rosters/mocks can be
  // kept in step.
  const prevLevel = (me.level ?? "").trim();
  if (patch.level !== prevLevel) {
    const name = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || me.student_code || "A learner";
    await notifyAdmins(admin, {
      title: "Learner changed their class",
      body: `${name} changed their class from ${prevLevel || "—"} to ${patch.level || "—"}.`,
      link: "/admin/students",
    });
  }

  return NextResponse.json({ ok: true, profile: patch });
}
