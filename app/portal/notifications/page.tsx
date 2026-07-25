import NotificationsClient from "@/components/portal/NotificationsClient";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supa = supabaseServer();
  // RLS scopes this to the signed-in user's own notifications.
  const { data } = await supa
    .from("notifications")
    .select("id, title, body, link, read, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return <NotificationsClient initial={data ?? []} />;
}
