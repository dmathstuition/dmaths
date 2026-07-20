import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveRecipientIds, deliverBroadcast, type Audience } from "@/lib/broadcast";

// Sends any scheduled broadcasts that are now due. Call on a schedule (e.g. a
// free cron-job.org job every ~5–15 min) with `Authorization: Bearer
// ${CRON_SECRET}` or `?key=${CRON_SECRET}` — same pattern as the other crons.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("authorization")?.trim();
  const keyParam = new URL(req.url).searchParams.get("key")?.trim();
  const authorized = !!secret && (header === `Bearer ${secret}` || keyParam === secret);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from("scheduled_broadcasts")
    .select("id, type, value, body, created_by")
    .is("sent_at", null)
    .lte("send_at", nowIso)
    .order("send_at", { ascending: true })
    .limit(25);

  // Table may not exist yet (migration not run) — treat as "nothing to do".
  if (error) return NextResponse.json({ sent: 0, broadcasts: 0, note: "scheduled_broadcasts not available" });
  if (!due?.length) return NextResponse.json({ sent: 0, broadcasts: 0 });

  // Fallback sender if the original admin was removed (messages.sender_id is a FK).
  const { data: anyAdmin } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).maybeSingle();

  let totalSent = 0;
  for (const b of due) {
    // Claim it first (idempotency): only proceed if we win the update race.
    const { data: claimed } = await admin
      .from("scheduled_broadcasts")
      .update({ sent_at: nowIso })
      .eq("id", b.id)
      .is("sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // another run already took it

    const sender = b.created_by ?? anyAdmin?.id;
    if (!sender) continue; // no valid sender to attribute the message to
    const ids = await resolveRecipientIds(admin, b.type as Audience, b.value ?? "");
    const { sent } = await deliverBroadcast(admin, sender, ids, b.body);
    totalSent += sent;
    await admin.from("scheduled_broadcasts").update({ recipients: sent }).eq("id", b.id);
  }

  return NextResponse.json({ sent: totalSent, broadcasts: due.length });
}
