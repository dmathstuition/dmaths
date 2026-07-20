import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/ratelimit";
import { AUDIENCE_TYPES, resolveRecipientIds, deliverBroadcast, type Audience } from "@/lib/broadcast";

async function requireAdmin() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: "Forbidden", status: 403 as const };
  return { user };
}

// Admin-only: send a direct message (+ push) to a whole audience — now, or
// scheduled for later. Scheduled ones are stored and sent by the cron.
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  if (!rateLimit(`broadcast:${gate.user.id}`, 6, 60_000)) {
    return NextResponse.json({ error: "You're sending broadcasts too fast — wait a moment." }, { status: 429 });
  }

  const payload = await req.json().catch(() => null);
  const body = String(payload?.body ?? "").trim().slice(0, 2000);
  const type = String(payload?.type ?? "") as Audience;
  const value = String(payload?.value ?? "");
  const sendAtRaw = String(payload?.sendAt ?? "").trim();

  if (!body) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (!AUDIENCE_TYPES.includes(type)) return NextResponse.json({ error: "Choose who to send to." }, { status: 400 });
  if (type !== "all" && !value) return NextResponse.json({ error: "Choose a target for that audience." }, { status: 400 });

  const admin = supabaseAdmin();

  // ── Scheduled ────────────────────────────────────────────────────
  if (sendAtRaw) {
    const when = new Date(sendAtRaw);
    if (isNaN(when.getTime())) return NextResponse.json({ error: "That date/time isn't valid." }, { status: 400 });
    if (when.getTime() < Date.now() + 60_000) {
      return NextResponse.json({ error: "Pick a time at least a minute from now (or send it now)." }, { status: 400 });
    }
    const { error } = await admin.from("scheduled_broadcasts").insert({
      type, value, body, send_at: when.toISOString(), created_by: gate.user.id,
    });
    if (error) {
      const msg = /scheduled_broadcasts.* does not exist/i.test(error.message)
        ? "Scheduling needs migration-scheduled-broadcasts.sql — run it in Supabase." : error.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true, scheduled: true, sendAt: when.toISOString() });
  }

  // ── Send now ─────────────────────────────────────────────────────
  const ids = await resolveRecipientIds(admin, type, value);
  if (!ids.length) return NextResponse.json({ error: "No active students match that audience." }, { status: 400 });
  const { sent, error } = await deliverBroadcast(admin, gate.user.id, ids, body);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ ok: true, sent });
}

// Cancel a pending scheduled broadcast.
export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only pending (unsent) broadcasts can be cancelled.
  const { error } = await supabaseAdmin().from("scheduled_broadcasts").delete().eq("id", id).is("sent_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
