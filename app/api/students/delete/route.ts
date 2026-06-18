import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, confirmName } = await req.json();
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: student } = await admin.from("profiles")
    .select("first_name,last_name,role").eq("id", studentId).single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (student.role === "admin") return NextResponse.json({ error: "Cannot delete an admin" }, { status: 400 });

  const expected = `${student.first_name} ${student.last_name}`.trim().toLowerCase();
  if ((confirmName || "").trim().toLowerCase() !== expected) {
    return NextResponse.json({ error: "Typed name does not match" }, { status: 400 });
  }

  await admin.from("audit_log").insert({
    actor_id: user.id, action: "student_deleted",
    detail: { studentId, name: expected },
  });

  // 1) Delete the AUTH user first. This is what stops them logging in.
  //    profiles.id references auth.users ON DELETE CASCADE, so this also
  //    removes the profile and every child row in one shot.
  const { error: authErr } = await admin.auth.admin.deleteUser(studentId);

  if (authErr) {
    // The auth user could NOT be removed (e.g. service-role key missing).
    // Do NOT delete the profile on its own — that would create an account
    // that can still log in but has no profile (the "empty portal" bug).
    // Instead, deactivate so they're locked out, and report the failure.
    await admin.from("profiles").update({ is_active: false }).eq("id", studentId);
    return NextResponse.json({
      error: "Could not fully delete the account (auth removal failed). The learner has been deactivated and locked out instead. Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment.",
    }, { status: 500 });
  }

  // Safety net: ensure the profile row is gone even if the cascade didn't fire.
  await admin.from("profiles").delete().eq("id", studentId);

  return NextResponse.json({ ok: true });
}
