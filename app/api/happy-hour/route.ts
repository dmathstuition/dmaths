import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/authRole";
import { readHappyHourUntil, happyHourActive, HAPPY_HOUR_KEY, HAPPY_HOUR_MULT } from "@/lib/happyHour";

// Happy Hour control. GET returns the current window (any signed-in user, for
// the banner). POST starts/stops it (admin only). The window is one app_settings
// row so the earn routes can read it cheaply.
export const dynamic = "force-dynamic";

export async function GET() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const until = await readHappyHourUntil(supabaseAdmin());
  return NextResponse.json({ until, active: happyHourActive(until), multiplier: HAPPY_HOUR_MULT });
}

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const admin = supabaseAdmin();
  const stop = body?.stop === true;
  const minutes = Math.max(1, Math.min(240, Math.round(Number(body?.minutes) || 0)));
  if (!stop && !minutes) return NextResponse.json({ error: "minutes required" }, { status: 400 });

  const value = stop ? new Date(0).toISOString() : new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await admin.from("app_settings")
    .upsert({ key: HAPPY_HOUR_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    const msg = /relation .*app_settings/i.test(error.message) ? "Happy Hour needs migration-app-settings.sql — run it in Supabase." : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  await admin.from("audit_log").insert({ actor_id: staff.id, action: stop ? "happy_hour_stop" : "happy_hour_start", detail: { minutes: stop ? 0 : minutes } });
  return NextResponse.json({ ok: true, until: stop ? null : value, active: !stop });
}
