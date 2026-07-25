// "Have we already emailed this today?"
//
// Reminder endpoints are safe to call often (a cron may be misconfigured, a
// browser tab may double-submit), so sending must be idempotent per day. Each
// send claims a row in email_log first: the unique index on
// (kind, recipient, ref, sent_on) makes the second claim fail, and we skip.
//
// Claim-before-send, not check-then-send: two overlapping runs can both pass a
// check, but only one can win the insert.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Claim = "send" | "already" | "unavailable";

const UNIQUE_VIOLATION = "23505";
const UNDEFINED_TABLE = "42P01";

export async function claimEmailSend(
  admin: SupabaseClient,
  kind: string,
  recipient: string,
  ref = "",
): Promise<Claim> {
  const { error } = await admin.from("email_log").insert({ kind, recipient, ref });
  if (!error) return "send";
  if (error.code === UNIQUE_VIOLATION) return "already";
  if (error.code === UNDEFINED_TABLE || /email_log/i.test(error.message)) return "unavailable";
  // Anything else (a network blip, say) — don't let a logging failure become a
  // reason to skip a reminder the family is waiting for.
  return "send";
}

// Is the guard in place at all? Callers that must not send without it (cron)
// check this up front rather than discovering it per-recipient.
export async function emailLogReady(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from("email_log").select("id").limit(1);
  return !error;
}

export const EMAIL_LOG_MISSING =
  "Run supabase/migration-email-log.sql before scheduling this — without it the same email would go out on every run.";
