import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";
import { notifyUser } from "@/lib/notify";
import { requireStaff, staffCanAccessStudent } from "@/lib/authRole";

export async function POST(req: Request) {
  // Admins reward anyone; tutors only learners in their roster.
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, stars, message, notify } = await req.json();
  const s = Number(stars);
  if (!studentId || !Number.isInteger(s) || s < 1 || s > 5 || !message) {
    return NextResponse.json({ error: "studentId, stars (1-5) and message required" }, { status: 400 });
  }
  if (!(await staffCanAccessStudent(staff, studentId))) {
    return NextResponse.json({ error: "That learner isn't in your roster." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("rewards").insert({ student_id: studentId, stars: s, message });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reflect latest star rating on the profile
  await admin.from("profiles").update({ stars: s }).eq("id", studentId);
  await admin.from("audit_log").insert({ actor_id: staff.id, action: "reward_given", detail: { studentId, stars: s } });
  await notifyUser(admin, studentId, {
    title: `You earned ${s} star${s > 1 ? "s" : ""}!`,
    body: message,
    link: "/portal/progress",
  });

  let emailed = false;
  if (notify) {
    const { data: student } = await admin.from("profiles").select("email,first_name").eq("id", studentId).single();
    if (student?.email) {
      emailed = await sendEmail("reward", student.email, {
        firstName: student.first_name, stars: s, message,
        loginUrl: loginUrl(),
      });
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
