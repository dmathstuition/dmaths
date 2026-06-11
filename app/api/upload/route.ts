import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const bucket = formData.get("bucket") as string;
  const folder = formData.get("folder") as string || "";

  if (!file || !bucket) {
    return NextResponse.json({ error: "Missing file or bucket" }, { status: 400 });
  }

  const allowedBuckets = ["materials", "curricula", "assignments", "submissions"];
  if (!allowedBuckets.includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  // Students can only upload to submissions
  const { data: profile } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && bucket !== "submissions") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(safeName, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({
    url: urlData.publicUrl,
    path: data.path,
    name: file.name,
    size: file.size,
  });
}
