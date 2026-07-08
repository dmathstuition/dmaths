import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, clientKey } from "@/lib/ratelimit";

// Upload a chat voice note. Any signed-in user may record one (learner or
// admin); the file lands in the public 'voice-notes' bucket via the service
// role and the returned URL is attached to a message (audio_url).
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB ≈ several minutes of opus audio

export async function POST(req: Request) {
  if (!rateLimit(clientKey(req, "voice"), 10, 60_000)) {
    return NextResponse.json({ error: "Too many recordings — slow down." }, { status: 429 });
  }

  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing audio" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Voice note too long — 5 MB maximum." }, { status: 413 });
  if (!/^audio\//.test(file.type) && !/^video\/mp4/.test(file.type)) {
    // (iOS Safari records m4a as video/mp4 containers)
    return NextResponse.json({ error: "Not an audio recording." }, { status: 415 });
  }

  const ext = /mp4|m4a/.test(file.type) ? "m4a" : /ogg/.test(file.type) ? "ogg" : "webm";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await supabaseAdmin().storage
    .from("voice-notes")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });

  if (error) {
    const missing = /bucket/i.test(error.message);
    return NextResponse.json(
      { error: missing ? "Voice-notes storage isn't set up yet — run supabase/storage-buckets.sql." : error.message },
      { status: 500 },
    );
  }

  const { data: urlData } = supabaseAdmin().storage.from("voice-notes").getPublicUrl(data.path);
  return NextResponse.json({ url: urlData.publicUrl });
}
