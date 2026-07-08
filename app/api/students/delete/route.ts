import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteLearnerCompletely } from "@/lib/deleteLearner";

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

  // The full removal machinery lives in lib/deleteLearner.ts (shared with the
  // learner's own "Delete my account" flow): children → attendance-lock
  // workaround → non-cascade refs → application/payment rows → profile → login.
  const result = await deleteLearnerCompletely(admin, studentId, student.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true });
}
