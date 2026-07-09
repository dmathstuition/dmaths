import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB — protects your 1GB free-tier storage
const ALLOWED_EXT = ["pdf", "doc", "docx", "ppt", "pptx", "jpg", "jpeg", "png"];
const ALLOWED_BUCKETS = ["materials", "curricula", "assignments", "submissions"];

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "upload"), 15, 60_000)) {
    return NextResponse.json({ error: "Too many uploads — slow down" }, { status: 429 });
  }

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const bucket = formData.get("bucket") as string;
  const folder = (formData.get("folder") as string) || "";

  if (!file || !bucket) return NextResponse.json({ error: "Missing file or bucket" }, { status: 400 });
  if (!ALLOWED_BUCKETS.includes(bucket)) return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large — 10 MB maximum" }, { status: 413 });

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: `File type .${ext} not allowed` }, { status: 415 });
  }

  const { data: profile } = await supa.from("profiles").select("role").eq("id", user.id).single();
  // Learners upload only submissions. Tutors may also post teaching materials +
  // assignment attachments. Everything else is admin-only.
  const role = profile?.role;
  const tutorAllowed = role === "tutor" && (bucket === "materials" || bucket === "assignments");
  if (role !== "admin" && bucket !== "submissions" && !tutorAllowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeFolder = folder.replace(/[^a-z0-9\-]/gi, "").slice(0, 60);
  const safeName = `${safeFolder ? safeFolder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await supabaseAdmin().storage
    .from(bucket)
    .upload(safeName, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: urlData } = supabaseAdmin().storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl, path: data.path, name: file.name, size: file.size });
}
