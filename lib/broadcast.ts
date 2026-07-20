import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyUser } from "@/lib/notify";

export type Audience = "all" | "level" | "subject" | "class";
export const AUDIENCE_TYPES: Audience[] = ["all", "level", "subject", "class"];

// Resolve a broadcast audience to a list of active-student ids.
export async function resolveRecipientIds(
  admin: SupabaseClient, type: Audience, value: string,
): Promise<string[]> {
  if (type === "class") {
    const { data } = await admin.from("class_students").select("student_id").eq("class_id", value);
    const roster = (data ?? []).map((r: any) => r.student_id);
    if (!roster.length) return [];
    const { data: active } = await admin.from("profiles").select("id")
      .in("id", roster).eq("role", "student").eq("is_active", true);
    return (active ?? []).map((r: any) => r.id);
  }
  let q = admin.from("profiles").select("id").eq("role", "student").eq("is_active", true);
  if (type === "level") q = q.eq("level", value);
  if (type === "subject") q = q.contains("subjects", [value]);
  const { data } = await q;
  return (data ?? []).map((r: any) => r.id);
}

// Insert one admin message per recipient and notify them (bell + push).
// Returns how many were delivered. Caps at 2000 recipients for safety.
export async function deliverBroadcast(
  admin: SupabaseClient, senderId: string, ids: string[], body: string,
): Promise<{ sent: number; error?: string }> {
  const recipients = ids.slice(0, 2000);
  if (!recipients.length) return { sent: 0 };

  const rows = recipients.map((sid) => ({ student_id: sid, sender_id: senderId, sender_role: "admin", body }));
  const { error } = await admin.from("messages").insert(rows);
  if (error) return { sent: 0, error: error.message };

  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;
  await Promise.allSettled(
    recipients.map((sid) => notifyUser(admin, sid, { title: "New message from D-Maths", body: preview, link: "/portal/messages" })),
  );
  return { sent: recipients.length };
}
