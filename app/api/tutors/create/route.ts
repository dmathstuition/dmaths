import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

// A fresh, strong temp password (letters + digits + symbols).
function makeTempPassword() {
  return (
    crypto.randomUUID().replace(/-/g, "").slice(0, 6) +
    crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase() +
    "@" + Math.floor(Math.random() * 90 + 10) + "!"
  );
}

// Find an existing auth user by email (case-insensitive) by paging listUsers.
// Handles the "email already registered" case where a previous attempt left an
// auth user with no matching profile row (the burned-email problem).
async function findAuthUserIdByEmail(admin: ReturnType<typeof supabaseAdmin>, email: string) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u: any) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

// Admin creates (or repairs/resets) a tutor account. Idempotent and self-
// healing: if the auth user already exists it is reused and its password reset,
// so a half-finished earlier attempt or a manual partial delete can't burn the
// email. Returns the temp credentials for the admin to copy/share.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email: rawEmail, firstName, lastName } = await req.json();
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // Don't clobber an account that belongs to a student / parent / admin.
  const { data: existingProfile } = await admin
    .from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existingProfile && existingProfile.role !== "tutor") {
    return NextResponse.json(
      { error: "An account with this email already exists with a different role." },
      { status: 409 },
    );
  }

  const tempPassword = makeTempPassword();

  // 1. Get an auth user id — create fresh, or reuse/reset an existing one.
  let userId: string;
  let createdNow = false;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  });

  if (created?.user) {
    userId = created.user.id;
    createdNow = true;
  } else if (createErr && /registered|already|exists/i.test(createErr.message)) {
    // Auth user already exists (possibly orphaned). Find it and reset its password.
    const existingId = existingProfile?.id ?? (await findAuthUserIdByEmail(admin, email));
    if (!existingId) {
      return NextResponse.json({ error: "This email is already registered but the account could not be located. Delete it in Supabase → Authentication and try again." }, { status: 500 });
    }
    userId = existingId;
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword, email_confirm: true,
    });
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: createErr?.message || "Failed to create tutor account" }, { status: 500 });
  }

  // 2. Ensure the profile row exists as a tutor. Crucially, CHECK this error:
  //    if the 'tutor' enum value is missing the migration hasn't been run, and
  //    we must not leave a confirmed auth user with no usable profile.
  const { error: profErr } = await admin.from("profiles").upsert({
    id: userId, role: "tutor",
    first_name: (firstName || "Tutor").trim(),
    last_name: (lastName || "").trim(),
    email, is_active: true,
  }, { onConflict: "id" });

  if (profErr) {
    // Roll back an auth user we created here so the email stays reusable.
    if (createdNow) await admin.auth.admin.deleteUser(userId).catch(() => {});
    const needsMigration = /invalid input value for enum|user_role|column .*role/i.test(profErr.message);
    return NextResponse.json({
      error: needsMigration
        ? "The tutor role isn't in your database yet — run migration-tutor-portal.sql in Supabase, then try again."
        : profErr.message,
    }, { status: 500 });
  }

  // 3. Best-effort email (template lives in the Apps Script relay); the admin
  //    also gets the credentials back to share manually.
  const emailed = await sendEmail("tutor_credentials", email, {
    tutorName: (firstName || "Tutor").trim(),
    email, tempPassword, loginUrl: loginUrl(),
  }).catch(() => false);

  await admin.from("audit_log").insert({
    actor_id: user.id, action: createdNow ? "tutor_created" : "tutor_reset", detail: { email },
  });

  return NextResponse.json({
    ok: true, created: createdNow, tutorId: userId,
    credentials: { email, tempPassword, loginUrl: loginUrl() }, emailed,
  });
}
