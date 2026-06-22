import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST() {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = supabaseAdmin();

  // Find assignments due tomorrow (date only comparison)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const { data: assignments } = await supa
    .from("assignments")
    .select("id, title, subject, due_date")
    .eq("due_date", dateStr);

  if (!assignments?.length) {
    return NextResponse.json({ sent: 0, message: "No assignments due tomorrow." });
  }

  const { data: subs } = await supa
    .from("assignment_submissions")
    .select("assignment_id, student:profiles(email, first_name)")
    .eq("status", "pending")
    .in("assignment_id", assignments.map(a => a.id));

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, message: "All students have already submitted." });
  }

  const assignmentMap = Object.fromEntries(assignments.map(a => [a.id, a]));

  let sent = 0;
  for (const sub of subs) {
    const student = sub.student as any;
    const assignment = assignmentMap[sub.assignment_id];
    if (!student?.email || !assignment) continue;
    const ok = await sendEmail("assignment_reminder", student.email, {
      firstName: student.first_name,
      assignmentTitle: assignment.title,
      subject: assignment.subject,
      dueDate: new Date(assignment.due_date).toLocaleDateString("en-NG", { dateStyle: "medium" }),
      loginUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
    });
    if (ok) sent++;
  }

  return NextResponse.json({ sent, total: subs.length });
}
