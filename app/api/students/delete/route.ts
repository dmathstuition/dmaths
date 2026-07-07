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
    .select("first_name,last_name,email,role").eq("id", studentId).single();
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
    { table: "audit_log",              col: "actor_id" },
    // Newer tables (added after this route was written). Most cascade off
    // profiles/auth.users already, but clearing them explicitly keeps deletion
    // robust against any non-cascade FK.
    { table: "messages",               col: "student_id" },
    { table: "messages",               col: "sender_id" },
    { table: "ratings",                col: "user_id" },
    { table: "push_subscriptions",     col: "user_id" },
  ];
  for (const { table, col } of childTables) {
    await admin.from(table).delete().eq(col, studentId); // per-table errors ignored
  }

  // 1a-bis) Null the referral self-reference. `profiles.referred_by` points at
  //    the student who referred this learner; if THIS learner referred anyone,
  //    those rows point back here. That FK is NOT cascade, so it would block the
  //    profile delete (Postgres → "Database error deleting user"). Clear it.
  await admin.from("profiles").update({ referred_by: null }).eq("referred_by", studentId);

  // 1b) Null any NON-cascade "creator / actor" references so the profile
  //     delete (below) can't be blocked by a leftover FK. These are normally
  //     empty for a student, but a deleted account could in theory have
  //     authored a note/log; clearing them keeps deletion robust.
  const actorRefs: { table: string; col: string }[] = [
    { table: "notices",          col: "created_by" },
    { table: "admin_notes",      col: "created_by" },
    { table: "behavior_logs",    col: "logged_by" },
    { table: "lesson_materials", col: "uploaded_by" },
    { table: "curricula",        col: "uploaded_by" },
  ];
  for (const { table, col } of actorRefs) {
    await admin.from(table).update({ [col]: null }).eq(col, studentId); // ignored if table absent
  }

  // 1c) The learner's original enrolment application and payment-ledger rows
  //     link only by email (no profile FK), so the UI's promise to remove
  //     "payment history" is only true if we clear them here too. Matched
  //     case-insensitively. (If the same email was reused for another learner,
  //     those shared rows are removed as well — consistent with the SQL tool.)
  const email = student.email?.trim();
  if (email) {
    await admin.from("applications").delete().ilike("email", email);
    await admin.from("payments").delete().ilike("email", email);
  }

  // 2) Delete the PROFILE row *before* the auth user. This mirrors the working
  //    delete-learner.sql tool. Doing it first means the delete never depends on
  //    the profiles → auth.users cascade being configured, and a non-cascade FK
  //    can't leave the auth deletion blocked with the profile still present.
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", studentId);
  if (profileErr) {
    // Something still references this profile with a non-cascade FK we didn't
    // clear. Surface the exact DB error so the specific table can be pinpointed.
    return NextResponse.json(
      { error: `Could not remove the student record: ${profileErr.message}. Run supabase/delete-learner.sql for this learner, or check for a table still linking to them.` },
      { status: 500 },
    );
  }

  // 3) Delete the AUTH login so they can no longer sign in and the email frees up.
  const { error: authErr } = await admin.auth.admin.deleteUser(studentId);

  if (authErr) {
    // "Not found" means the auth user was already gone — the profile (now also
    // deleted) was an orphan, so the learner is fully removed. Success.
    const notFound =
      authErr.message?.toLowerCase().includes("not found") ||
      (authErr as any).status === 404;
    if (notFound) return NextResponse.json({ ok: true });

    // The student record is already gone (they've disappeared from the portal),
    // but the login row lingered. Report the raw error so it can be cleared.
    return NextResponse.json(
      { error: `The student was removed, but their login could not be fully deleted (${authErr.message}). Run supabase/delete-learner.sql to clear the leftover login.` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
