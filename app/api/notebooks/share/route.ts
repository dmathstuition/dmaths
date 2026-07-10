import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// A tutor/admin marks one of their saved notebooks as shared (or unshares it), so
// their learners can open a copy as a starter. Staff-only; you can only toggle a
// notebook you own.
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supa.from("profiles").select("role, first_name, last_name").eq("id", user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "tutor")) {
    return NextResponse.json({ error: "Only tutors and admins can share notebooks." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const snippetId = String(body?.snippetId ?? "");
  const shared = Boolean(body?.shared);
  if (!snippetId) return NextResponse.json({ error: "Missing notebook." }, { status: 400 });

  const admin = supabaseAdmin();
  // Only the owner may toggle, and only a notebook (not a plain snippet).
  const { data: row } = await admin.from("code_snippets").select("id, user_id, language").eq("id", snippetId).single();
  if (!row || row.user_id !== user.id) return NextResponse.json({ error: "Notebook not found." }, { status: 404 });
  if (row.language !== "notebook") return NextResponse.json({ error: "Only notebooks can be shared." }, { status: 400 });

  const name = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "A tutor";
  const { error } = await admin.from("code_snippets")
    .update({ shared, shared_by_name: shared ? name : null })
    .eq("id", snippetId);
  if (error) {
    return NextResponse.json(
      { error: /shared/i.test(error.message) ? "Run migration-shared-notebooks.sql in Supabase first." : "Could not update sharing." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true, shared });
}
