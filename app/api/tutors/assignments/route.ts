import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notify";
import { requireStaff, getRoster } from "@/lib/authRole";

// Staff create an assignment for a chosen set of learners. Tutors are limited to
// their own roster; the assignment + a per-learner submission stub are created
// via the service role. Written/CBT-link only in Phase 2 (no inline CBT builder).
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 200);
  const subject = String(body?.subject ?? "").trim().slice(0, 80) || "General";
  const type = ["cbt", "code"].includes(body?.type) ? body.type : "written";
  const instructions = String(body?.instructions ?? "").slice(0, 4000);
  const cbtLink = String(body?.cbtLink ?? "").trim();
  const codeLanguage = body?.codeLanguage === "web" ? "web" : "python";
  const starterCode = String(body?.starterCode ?? "").slice(0, 20000);
  const fileUrl = String(body?.fileUrl ?? "").trim();
  const fileName = String(body?.fileName ?? "").trim();
  const dueAt = body?.dueAt ? String(body.dueAt) : null;         // ISO (already WAT→UTC on client)
  const dueDate = body?.dueDate ? String(body.dueDate) : null;   // yyyy-mm-dd
  let studentIds: string[] = Array.isArray(body?.studentIds) ? body.studentIds.map(String) : [];

  if (!title) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  if (type === "cbt" && cbtLink && !/^https?:\/\//i.test(cbtLink)) {
    return NextResponse.json({ error: "CBT link must start with http:// or https://" }, { status: 400 });
  }

  // Scope the target learners to what this staff member may reach.
  if (staff.role === "tutor") {
    const roster = new Set(await getRoster(staff.id));
    studentIds = studentIds.filter((id) => roster.has(id));
    if (studentIds.length === 0) {
      return NextResponse.json({ error: "Pick at least one learner from your roster." }, { status: 400 });
    }
  }
  if (studentIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one learner." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const payload: any = {
    title, subject, type, instructions,
    due_date: dueDate, due_at: dueAt,
    cbt_link: type === "cbt" ? cbtLink : "",
    file_url: fileUrl, file_name: fileName,
    ...(type === "code" ? { code_language: codeLanguage, starter_code: starterCode } : {}),
  };

  // due_at column may not exist on older DBs — fall back to date-only.
  let { data: a, error } = await admin.from("assignments").insert(payload).select().single();
  if (error && /due_at/i.test(error.message)) {
    const { due_at: _omit, ...rest } = payload;
    ({ data: a, error } = await admin.from("assignments").insert(rest).select().single());
  }
  if (error && /code_language|starter_code/i.test(error.message)) {
    return NextResponse.json({ error: "Coding assignments need migration-code-assignments.sql — run it in Supabase." }, { status: 500 });
  }
  if (error || !a) return NextResponse.json({ error: error?.message || "Could not create assignment." }, { status: 500 });

  const { error: subErr } = await admin.from("assignment_submissions")
    .insert(studentIds.map((sid) => ({ assignment_id: a.id, student_id: sid })));
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

  await admin.from("audit_log").insert({
    actor_id: staff.id, action: "assignment_created", detail: { assignmentId: a.id, count: studentIds.length },
  });

  // Alert each learner.
  for (const sid of studentIds) {
    await notifyUser(admin, sid, {
      title: "New assignment",
      body: `${title} (${subject})`,
      link: "/portal/assignments",
    });
  }

  return NextResponse.json({ ok: true, assignment: a, count: studentIds.length });
}
