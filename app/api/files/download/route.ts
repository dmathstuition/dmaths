import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { staffCanAccessStudent, type Staff } from "@/lib/authRole";
import { parseStorageUrl, isPrivateBucket } from "@/lib/storageUrls";

// The only way to read a private storage object (a learner's submitted work, a
// chat voice note). We work out who is asking, check they are entitled to this
// exact file, then redirect to a signed URL that expires in five minutes.
//
// Everything here is deny-by-default: an object we can't tie back to a row the
// caller is part of is refused, even for an admin's own files.
export const dynamic = "force-dynamic";

const SIGNED_FOR = 300; // seconds

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") || "";
  const parsed = parseStorageUrl(raw);
  if (!parsed) return NextResponse.json({ error: "Not a storage file." }, { status: 400 });

  // Public teaching content never routes through here; if it does, don't sign
  // anything — just send them to the object.
  if (!isPrivateBucket(parsed.bucket)) return NextResponse.redirect(raw);

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  const role = me?.role ?? "";
  const admin = supabaseAdmin();

  const allowed = parsed.bucket === "voice-notes"
    ? await canReadVoiceNote(admin, raw, parsed.path, user.id, role)
    : await canReadSubmission(admin, raw, user.id, role);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await admin.storage.from(parsed.bucket).createSignedUrl(parsed.path, SIGNED_FOR);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "That file is no longer available." }, { status: 404 });
  }

  const res = NextResponse.redirect(data.signedUrl);
  // Never let a shared cache hold on to the redirect — the signature is
  // per-request and short-lived on purpose.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

// A voice note is readable by the person who recorded it, by an admin who is
// party to the thread, and by the two people the thread belongs to.
async function canReadVoiceNote(
  admin: ReturnType<typeof supabaseAdmin>, url: string, path: string, userId: string, role: string,
) {
  // Uploads are stored under the recorder's own id.
  if (path.startsWith(`${userId}/`)) return true;

  const { data: msg } = await admin
    .from("messages").select("*").eq("audio_url", url).maybeSingle();
  if (!msg) return false;

  if (role === "admin") return true;
  return msg.student_id === userId || msg.tutor_id === userId;
}

// A submitted file is readable by the learner who submitted it and by staff who
// are responsible for that learner (admins everyone, tutors their roster only).
async function canReadSubmission(
  admin: ReturnType<typeof supabaseAdmin>, url: string, userId: string, role: string,
) {
  const { data: sub } = await admin
    .from("assignment_submissions").select("student_id").eq("file_url", url).maybeSingle();
  if (!sub) return false;

  if (sub.student_id === userId) return true;
  if (role !== "admin" && role !== "tutor") return false;
  return staffCanAccessStudent({ id: userId, role } as Staff, sub.student_id);
}
