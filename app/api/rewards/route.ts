import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, stars, message, notify } = await req.json();
  const s = Number(stars);
  if (!studentId || !Number.isInteger(s) || s < 1 || s > 5 || !message) {
    return NextResponse.json({ error: "studentId, stars (1-5) and message required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.from("rewards").insert({ student_id: studentId, stars: s, message });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reflect latest star rating on the profile
  await admin.from("profiles").update({ stars: s }).eq("id", studentId);
  await admin.from("audit_log").insert({ actor_id: user.id, action: "reward_given", detail: { studentId, stars: s } });

  let emailed = false;
  if (notify) {
    const { data: student } = await admin.from("profiles").select("email,first_name").eq("id", studentId).single();
    if (student?.email) {
      emailed = await sendEmail("reward", student.email, {
        firstName: student.first_name, stars: s, message,
        loginUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
      });
    }
  }

  return NextResponse.json({ ok: true, emailed });
}
