import { supabaseServer } from "@/lib/supabase/server";
import ProfileClient from "@/components/portal/ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: me } = await supa.from("profiles").select("*").eq("id", user!.id).single();
  return <ProfileClient me={me} />;
}
