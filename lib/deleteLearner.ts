import type { SupabaseClient } from "@supabase/supabase-js";

// Complete removal of a learner and every record tied to them. Shared by the
// admin "Danger zone" delete and the learner's own "Delete my account"
// (a Google Play requirement), so both paths stay identical and battle-tested.
//
// Order matters: children → attendance (worked around the lock trigger) →
// non-cascade references → email-matched application/payment rows → the
// profile row → the auth login. Deleting the profile BEFORE the auth user
// means we never depend on the profiles → auth.users cascade, and a blocked
// cascade can't strand a half-deleted account.
export type DeleteResult = { ok: boolean; error?: string };

export async function deleteLearnerCompletely(
  admin: SupabaseClient,
  studentId: string,
  email?: string | null,
): Promise<DeleteResult> {
  // 1) Child rows. Tables from un-applied migrations error harmlessly.
  const childTables: { table: string; col: string }[] = [
    { table: "assignment_submissions", col: "student_id" },
    { table: "class_students",         col: "student_id" },
    { table: "admin_notes",            col: "student_id" },
    { table: "rewards",                col: "student_id" },
    { table: "behavior_logs",          col: "student_id" },
    { table: "student_badges",         col: "student_id" },
    { table: "guardian_tokens",        col: "student_id" },
    { table: "parent_student_links",   col: "student_id" },
    { table: "notifications",          col: "user_id" },
    { table: "audit_log",              col: "actor_id" },
    { table: "messages",               col: "student_id" },
    { table: "messages",               col: "sender_id" },
    { table: "ratings",                col: "user_id" },
    { table: "push_subscriptions",     col: "user_id" },
  ];
  for (const { table, col } of childTables) {
    await admin.from(table).delete().eq(col, studentId); // per-table errors ignored
  }

  // 2) Attendance can be guarded by an "attendance locked" trigger. Temporarily
  //    unlock only the classes THIS learner has locked attendance in, remove
  //    their rows, then re-lock — other students' locked attendance untouched.
  try {
    const { data: att } = await admin
      .from("attendance_records").select("class_id").eq("student_id", studentId);
    const classIds = Array.from(
      new Set((att ?? []).map((a: { class_id?: string }) => a.class_id).filter(Boolean)),
    ) as string[];
    let lockedIds: string[] = [];
    if (classIds.length) {
      const { data: cls } = await admin
        .from("classes").select("id, attendance_locked").in("id", classIds);
      lockedIds = (cls ?? [])
        .filter((c: { attendance_locked?: boolean }) => c.attendance_locked)
        .map((c: { id: string }) => c.id);
      if (lockedIds.length) {
        await admin.from("classes").update({ attendance_locked: false }).in("id", lockedIds);
      }
    }
    await admin.from("attendance_records").delete().eq("student_id", studentId);
    if (lockedIds.length) {
      await admin.from("classes").update({ attendance_locked: true }).in("id", lockedIds);
    }
  } catch { /* best-effort — the profile delete below reports any real blocker */ }

  // 3) Null the referral self-reference (non-cascade FK) and any non-cascade
  //    creator/actor references so nothing blocks the profile delete.
  await admin.from("profiles").update({ referred_by: null }).eq("referred_by", studentId);
  const actorRefs: { table: string; col: string }[] = [
    { table: "notices",          col: "created_by" },
    { table: "admin_notes",      col: "created_by" },
    { table: "behavior_logs",    col: "logged_by" },
    { table: "lesson_materials", col: "uploaded_by" },
    { table: "curricula",        col: "uploaded_by" },
  ];
  for (const { table, col } of actorRefs) {
    await admin.from(table).update({ [col]: null }).eq(col, studentId);
  }

  // 4) Enrolment application + payment-ledger rows link only by email.
  const trimmed = email?.trim();
  if (trimmed) {
    await admin.from("applications").delete().ilike("email", trimmed);
    await admin.from("payments").delete().ilike("email", trimmed);
  }

  // 5) Profile row, then the auth login.
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", studentId);
  if (profileErr) {
    return {
      ok: false,
      error: `Could not remove the student record: ${profileErr.message}. Run supabase/delete-learner.sql for this learner, or check for a table still linking to them.`,
    };
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(studentId);
  if (authErr) {
    const notFound =
      authErr.message?.toLowerCase().includes("not found") ||
      (authErr as { status?: number }).status === 404;
    if (notFound) return { ok: true }; // orphaned profile — now fully removed
    return {
      ok: false,
      error: `The student was removed, but their login could not be fully deleted (${authErr.message}). Run supabase/delete-learner.sql to clear the leftover login.`,
    };
  }

  return { ok: true };
}

// Removal of a PARENT account (self-service). Parents own far fewer records:
// links to children, notifications/push/ratings, then profile + login.
export async function deleteParentCompletely(
  admin: SupabaseClient,
  parentId: string,
): Promise<DeleteResult> {
  for (const { table, col } of [
    { table: "parent_student_links", col: "parent_id" },
    { table: "notifications",        col: "user_id" },
    { table: "push_subscriptions",   col: "user_id" },
    { table: "ratings",              col: "user_id" },
    { table: "audit_log",            col: "actor_id" },
  ]) {
    await admin.from(table).delete().eq(col, parentId);
  }

  const { error: profileErr } = await admin.from("profiles").delete().eq("id", parentId);
  if (profileErr) return { ok: false, error: `Could not remove the account: ${profileErr.message}` };

  const { error: authErr } = await admin.auth.admin.deleteUser(parentId);
  if (authErr) {
    const notFound =
      authErr.message?.toLowerCase().includes("not found") ||
      (authErr as { status?: number }).status === 404;
    if (!notFound) {
      return { ok: false, error: `The account was removed, but the login could not be fully deleted (${authErr.message}).` };
    }
  }
  return { ok: true };
}
