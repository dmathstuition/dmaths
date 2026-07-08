import ProfileClient from "@/components/portal/ProfileClient";
import DeleteAccountCard from "@/components/portal/DeleteAccountCard";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getProfile();
  return (
    <div className="space-y-6">
      <ProfileClient me={me} />
      <DeleteAccountCard />
    </div>
  );
}
