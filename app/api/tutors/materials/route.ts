import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";

// Staff post a lesson material record (the file itself is uploaded via
// /api/upload first). Tutor-posted materials are visible to learners like the
// admin's, attributed via uploaded_by.
export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 200);
  const subject = String(body?.subject ?? "").trim().slice(0, 80) || "General";
  const description = String(body?.description ?? "").slice(0, 2000);
  const fileUrl = String(body?.fileUrl ?? "").trim();
  const fileName = String(body?.fileName ?? "").trim();
  const fileSize = Number(body?.fileSize) || null;

  if (!title || !fileUrl) return NextResponse.json({ error: "Title and file are required." }, { status: 400 });
  if (!/^https?:\/\//i.test(fileUrl)) return NextResponse.json({ error: "Invalid file link." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.from("lesson_materials").insert({
    title, subject, description,
    file_url: fileUrl, file_name: fileName, file_size: fileSize,
    uploaded_by: staff.id,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("audit_log").insert({ actor_id: staff.id, action: "material_posted", detail: { title } });
  return NextResponse.json({ ok: true, material: data });
}

// Delete a material. Admins delete any; tutors only ones they posted.
export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: mat } = await admin.from("lesson_materials").select("uploaded_by").eq("id", id).maybeSingle();
  if (!mat) return NextResponse.json({ ok: true, alreadyGone: true });
  if (staff.role !== "admin" && mat.uploaded_by !== staff.id) {
    return NextResponse.json({ error: "You can only delete materials you posted." }, { status: 403 });
  }

  const { error } = await admin.from("lesson_materials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
