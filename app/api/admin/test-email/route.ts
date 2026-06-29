import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { sendEmailResult } from "@/lib/email";
import { loginUrl } from "@/lib/siteUrl";

// Admin-only self-serve email diagnostic. Sends a test message through the
// Apps Script relay using an EXISTING template (`notice`) — so it works without
// any Apps Script change — and returns the relay's exact outcome, making the
// cause of a failed send visible (e.g. "unauthorized" = secret mismatch,
// "Service invoked too many times" = Gmail daily quota).
export async function POST(req: Request) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { to } = await req.json().catch(() => ({ to: null }));
  const address = String(to || "").trim();
  if (!address || !address.includes("@")) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const result = await sendEmailResult("notice", address, {
    title: "D-Maths test email",
    body: "If you can read this, your email relay is working correctly. ✅",
    loginUrl: loginUrl(),
  });

  return NextResponse.json(result);
}
