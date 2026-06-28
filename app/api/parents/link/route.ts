import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId, parentEmail, parentName } = await req.json();
  if (!studentId || !parentEmail) {
    return NextResponse.json({ error: "studentId and parentEmail required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const email = parentEmail.trim().toLowerCase();

  const { data: student } = await admin.from("profiles")
    .select("first_name,last_name,student_code").eq("id", studentId).single();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // If a parent profile with this email already exists, just add the link
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .eq("role", "parent")
    .maybeSingle();

  if (existing) {
    await admin.from("parent_student_links").upsert(
      { parent_id: existing.id, student_id: studentId },
      { onConflict: "parent_id,student_id" },
    );
    return NextResponse.json({ ok: true, created: false });
  }

  // New parent — create auth + profile + link + email credentials
  const tempPassword =
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!";

  const { data: parentAuth, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authErr || !parentAuth.user) {
    return NextResponse.json(
      { error: authErr?.message || "Failed to create parent account" },
      { status: 500 },
    );
  }

  const displayName = (parentName || "Parent/Guardian").trim();

  await admin.from("profiles").insert({
    id: parentAuth.user.id,
    role: "parent",
    first_name: displayName,
    last_name: "",
    email,
    is_active: true,
  });

  await admin.from("parent_student_links").insert({
    parent_id: parentAuth.user.id,
    student_id: studentId,
  });

  await sendEmail("parent_credentials", email, {
    parentName: displayName,
    studentName: `${student.first_name} ${student.last_name}`,
    studentCode: student.student_code,
    email,
    tempPassword,
    loginUrl: loginUrl(),
  });

  return NextResponse.json({ ok: true, created: true });
}
