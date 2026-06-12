import ProfileClient from "@/components/portal/ProfileClient";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getProfile();
  return <ProfileClient me={me} />;
}
