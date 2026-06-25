import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Daily keep-alive: a trivial authenticated query registers activity so the
// free-tier Supabase project never idles long enough to auto-pause (~7 days).
// Triggered by the Vercel Cron defined in vercel.json. Vercel injects
// `Authorization: Bearer ${CRON_SECRET}` into the request when CRON_SECRET is set.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseAdmin().from("profiles").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
