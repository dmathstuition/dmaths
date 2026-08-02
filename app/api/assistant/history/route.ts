import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Saved A.I conversations for the full assistant page. Each conversation stores
// its whole message list as JSON on one row. Auth is checked here; writes use
// the service role. Degrades to empty before migration-ai-history.sql is run.
export const dynamic = "force-dynamic";

const explain = (m: string) =>
  /relation .*ai_conversations/i.test(m)
    ? "Chat history needs migration-ai-history.sql — run it in Supabase."
    : m;

type Msg = { role: "user" | "assistant"; content: string };
function cleanMessages(x: any): Msg[] {
  return (Array.isArray(x) ? x : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-100)
    .map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content).slice(0, 4000) }));
}
function titleFrom(messages: Msg[]): string {
  const first = messages.find((m) => m.role === "user");
  const t = (first?.content ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return t || "New chat";
}

async function me() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

// GET            → list conversations (id, title, updated_at)
// GET ?id=<uuid> → one conversation's messages
export async function GET(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();
  const id = new URL(req.url).searchParams.get("id");

  if (id) {
    const { data, error } = await admin.from("ai_conversations")
      .select("id, title, messages").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: explain(error.message), messages: [] }, { status: 200 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ id: data.id, title: data.title, messages: data.messages ?? [] });
  }

  const { data, error } = await admin.from("ai_conversations")
    .select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(60);
  if (error) return NextResponse.json({ conversations: [], note: explain(error.message) });
  return NextResponse.json({ conversations: data ?? [] });
}

// POST { id?, messages } → create or update a conversation. Returns { id, title }.
export async function POST(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = supabaseAdmin();

  const body = await req.json().catch(() => null);
  const messages = cleanMessages(body?.messages);
  if (!messages.length) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const title = titleFrom(messages);
  const id = typeof body?.id === "string" ? body.id : null;

  if (id) {
    const { data, error } = await admin.from("ai_conversations")
      .update({ messages, title, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id).select("id, title").maybeSingle();
    if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
    if (data) return NextResponse.json({ id: data.id, title: data.title });
    // Row not found (e.g. deleted elsewhere) → fall through to insert a new one.
  }

  const { data, error } = await admin.from("ai_conversations")
    .insert({ user_id: user.id, title, messages }).select("id, title").single();
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ id: data.id, title: data.title });
}

// DELETE ?id=<uuid>
export async function DELETE(req: Request) {
  const user = await me();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabaseAdmin().from("ai_conversations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: explain(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
