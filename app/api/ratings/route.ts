import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyAdmins } from "@/lib/notify";

// A student or parent submits a quick star rating (1–5) + optional comment.
// Admins are alerted (bell + push) and see it under Admin → Feedback.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa
    .from("profiles").select("role, first_name, last_name").eq("id", user.id).single();
  if (!me || (me.role !== "student" && me.role !== "parent")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const stars = Number(payload?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Please choose a rating from 1 to 5 stars." }, { status: 400 });
  }
  const comment = String(payload?.comment ?? "").trim().slice(0, 500);

  const admin = supabaseAdmin();
  const { error } = await admin.from("ratings").insert({
    user_id: user.id, role: me.role, stars, comment,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const who = `${me.first_name ?? "A user"}${me.role === "parent" ? " (parent)" : ""}`.trim();
  await notifyAdmins(admin, {
    title: `New ${stars}★ rating from ${who}`,
    body: comment ? (comment.length > 120 ? `${comment.slice(0, 117)}…` : comment) : undefined,
    link: "/admin/ratings",
  });

  return NextResponse.json({ ok: true });
}
