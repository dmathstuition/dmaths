import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";
import { JITSI_DOMAIN, roomNameFor } from "@/lib/liveRoom";

export const dynamic = "force-dynamic";

// A learner joins the in-portal live class. RLS on `classes` only returns a class
// the learner is enrolled in, so an unauthorised id simply bounces them back.
export default async function LiveClassPage({ params }: { params: { id: string } }) {
  const me = await getProfile();
  if (!me || me.role !== "student") redirect("/login?gone=1");

  const { data: cls } = await supabaseServer().from("classes").select("id, subject").eq("id", params.id).single();
  if (!cls) redirect("/portal/classes");

  const name = `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() || "Learner";
  return (
    <LiveRoom domain={JITSI_DOMAIN} roomName={roomNameFor(cls.id)} displayName={name}
      isModerator={false} subject={cls.subject} backHref="/portal/classes" />
  );
}
