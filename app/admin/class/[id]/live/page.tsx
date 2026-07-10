import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";
import { JITSI_DOMAIN, roomNameFor } from "@/lib/liveRoom";

export const dynamic = "force-dynamic";

// Admin hosts the in-portal live class for any class.
export default async function AdminLiveClassPage({ params }: { params: { id: string } }) {
  const me = await getProfile();
  if (!me || me.role !== "admin") redirect("/login?gone=1");

  const { data: cls } = await supabaseServer().from("classes").select("id, subject").eq("id", params.id).single();
  if (!cls) redirect("/admin/classes");

  const name = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "Admin";
  return (
    <LiveRoom domain={JITSI_DOMAIN} roomName={roomNameFor(cls.id)} displayName={name}
      isModerator subject={cls.subject} backHref="/admin/classes" />
  );
}
