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
    // If the auth user simply doesn't exist, the profile is an orphan — safe to delete directly.
    const notFound =
      authErr.message?.toLowerCase().includes("not found") ||
      (authErr as any).status === 404;

    if (notFound) {
      await admin.from("profiles").delete().eq("id", studentId);
      return NextResponse.json({ ok: true });
    }

    // Real failure (key missing, network, etc.) — deactivate as fallback.
    const { error: deactivateErr } = await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", studentId);

    const deactivated = !deactivateErr;
    return NextResponse.json(
      {
        error:
          `Auth removal failed (${authErr.message}). ` +
          (deactivated
            ? "The learner has been deactivated and locked out instead."
            : "Deactivation also failed — check SUPABASE_SERVICE_ROLE_KEY in Vercel."),
      },
      { status: 500 },
    );
  }

  // Safety net: ensure the profile row is gone even if the cascade didn't fire.
  await admin.from("profiles").delete().eq("id", studentId);

  return NextResponse.json({ ok: true });
}
