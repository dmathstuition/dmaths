// Public credential verification: given a serial from a printed certificate or
// report card, confirm it's genuine and return ONLY what's safe to show a
// stranger — the learner's name, what it is, and when it was issued. Never an
// email, id, grades or anything else.
//
// Reads with the service role because the row's RLS is owner/admin-only; the
// caller (app/verify) is a public page, so this deliberately narrows the fields.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Credential = {
  kind: "certificate" | "report-card";
  serial: string;
  name: string;
  title: string;       // certificate title, or "Progress Report — <term>"
  subtitle?: string;
  issuedAt: string;
};

const cleanSerial = (raw: string) => raw.trim().toUpperCase().slice(0, 40);

async function nameFor(admin: SupabaseClient, studentId: string | null): Promise<string> {
  if (!studentId) return "A learner";
  const { data } = await admin.from("profiles").select("first_name, last_name").eq("id", studentId).maybeSingle();
  return `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim() || "A learner";
}

// Look the serial up in both tables. Certificates use DM-…, report cards RC-…,
// but we don't rely on the prefix — we just check both, so a future format can't
// silently break verification.
export async function lookupCredential(admin: SupabaseClient, rawSerial: string): Promise<Credential | null> {
  const serial = cleanSerial(rawSerial);
  if (!serial) return null;

  const { data: cert } = await admin
    .from("certificates").select("serial, title, subtitle, student_id, issued_at").eq("serial", serial).maybeSingle();
  if (cert) {
    return {
      kind: "certificate",
      serial: cert.serial,
      name: await nameFor(admin, cert.student_id),
      title: cert.title || "Certificate",
      subtitle: cert.subtitle || undefined,
      issuedAt: cert.issued_at,
    };
  }

  const { data: rc } = await admin
    .from("report_cards").select("serial, term, student_id, issued_at").eq("serial", serial).maybeSingle();
  if (rc) {
    return {
      kind: "report-card",
      serial: rc.serial,
      name: await nameFor(admin, rc.student_id),
      title: "Progress Report",
      subtitle: rc.term || undefined,
      issuedAt: rc.issued_at,
    };
  }

  return null;
}
