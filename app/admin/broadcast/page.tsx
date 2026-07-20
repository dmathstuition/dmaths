import BroadcastClient from "@/components/admin/BroadcastClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const supa = supabaseServer();
  const now = new Date().toISOString();
  const [{ data: students }, { data: classes }, { data: scheduled }] = await Promise.all([
    supa.from("profiles").select("level, subjects, is_active").eq("role", "student").eq("is_active", true),
    supa.from("classes").select("id, subject, starts_at").gte("starts_at", now)
      .order("starts_at", { ascending: true }).limit(60),
    // Pending (unsent) scheduled broadcasts. Errors harmlessly to null pre-migration.
    supa.from("scheduled_broadcasts").select("id, type, value, body, send_at")
      .is("sent_at", null).order("send_at", { ascending: true }),
  ]);

  // Distinct levels and subjects across active students.
  const levels = Array.from(new Set((students ?? []).map((s: any) => s.level).filter(Boolean))).sort();
  const subjects = Array.from(new Set((students ?? []).flatMap((s: any) => s.subjects ?? []).filter(Boolean))).sort();
  const total = students?.length ?? 0;

  return (
    <BroadcastClient
      levels={levels as string[]}
      subjects={subjects as string[]}
      classes={(classes ?? []) as any[]}
      totalActive={total}
      scheduled={(scheduled ?? []) as any[]}
    />
  );
}
