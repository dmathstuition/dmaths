import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireStaff } from "@/lib/authRole";
import { rateLimit } from "@/lib/ratelimit";

// Admin/tutor-only diagnostic: makes a tiny real call to DeepSeek and reports
// exactly what happened, so you can verify the key from inside the app without
// needing a learner account. Never exposes the key itself.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export async function POST() {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ ok: false, stage: "forbidden", message: "Staff only." }, { status: 403 });
  if (!rateLimit(`assistant-health:${staff.id}`, 6, 60_000)) {
    return NextResponse.json({ ok: false, stage: "rate_limit", message: "Please wait a moment before testing again." }, { status: 429 });
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false, stage: "not_configured",
      message: "DEEPSEEK_API_KEY is not set on this deployment. Add it in Vercel → Environment Variables (Production), then redeploy.",
    });
  }

  try {
    const client = new OpenAI({ apiKey: key, baseURL: BASE_URL });
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 8,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
    });
    const reply = (res.choices[0]?.message?.content ?? "").trim();
    return NextResponse.json({ ok: true, model: MODEL, reply: reply || "(empty reply)" });
  } catch (err: any) {
    let stage = "error";
    let message = err?.message || "Unknown error contacting DeepSeek.";
    if (err instanceof OpenAI.AuthenticationError) { stage = "auth"; message = "DeepSeek rejected the key (invalid key)."; }
    else if (err instanceof OpenAI.RateLimitError) { stage = "rate_limit"; message = "Rate limited, or the DeepSeek account has no balance/credit."; }
    else if (err?.status === 402) { stage = "billing"; message = "DeepSeek says the account has insufficient balance — add credit at platform.deepseek.com."; }
    return NextResponse.json({ ok: false, stage, status: err?.status ?? null, message });
  }
}
