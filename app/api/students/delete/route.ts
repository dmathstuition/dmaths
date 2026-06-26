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

  // 1) Explicitly remove the student's child rows BEFORE deleting the auth user.
  //    In theory profiles.id → auth.users is ON DELETE CASCADE and every child
  //    table cascades off profiles, so deleting the auth user would be enough.
  //    In practice, if any of these FKs in the live database is NOT cascade
  //    (schema drift), the auth deletion fails with "Database error deleting
  //    user". Clearing the children first makes deletion robust regardless of
  //    how the constraints are configured. The service role bypasses RLS.
  //    Tables that may not exist yet (un-applied migrations) error harmlessly.
  const childTables: { table: string; col: string }[] = [
    { table: "assignment_submissions", col: "student_id" },
    { table: "attendance_records",     col: "student_id" },
    { table: "class_students",         col: "student_id" },
    { table: "admin_notes",            col: "student_id" },
    { table: "rewards",                col: "student_id" },
    { table: "behavior_logs",          col: "student_id" },
    { table: "student_badges",         col: "student_id" },
    { table: "guardian_tokens",        col: "student_id" },
    { table: "parent_student_links",   col: "student_id" },
    { table: "notifications",          col: "user_id" },
  ];
  for (const { table, col } of childTables) {
    await admin.from(table).delete().eq(col, studentId); // per-table errors ignored
  }

  // 2) Delete the AUTH user. profiles.id → auth.users ON DELETE CASCADE removes
  //    the profile row too. This is what stops them logging in.
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
