import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";
import { JITSI_DOMAIN, roomNameFor } from "@/lib/liveRoom";

export const dynamic = "force-dynamic";

// A tutor hosts the in-portal live class. RLS returns the class only if it's
// assigned to this tutor (or they're admin), so others bounce back.
export default async function TutorLiveClassPage({ params }: { params: { id: string } }) {
  const me = await getProfile();
  if (!me || (me.role !== "tutor" && me.role !== "admin")) redirect("/login?gone=1");

  const { data: cls } = await supabaseServer().from("classes").select("id, subject").eq("id", params.id).single();
  if (!cls) redirect("/tutor/classes");

  const name = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "Tutor";
  return (
    <LiveRoom domain={JITSI_DOMAIN} roomName={roomNameFor(cls.id)} displayName={name}
      isModerator subject={cls.subject} backHref="/tutor/classes" />
  );
}
