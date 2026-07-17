import TwoFactorSetup from "@/components/admin/TwoFactorSetup";

export const dynamic = "force-dynamic";

// Admin account security — two-factor authentication. The /admin layout already
// gates this to admins.
export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Security</h1>
        <p className="text-sm text-ink/50">Protect the admin account with a second sign-in step.</p>
      </div>
      <div className="max-w-2xl">
        <TwoFactorSetup />
      </div>
    </div>
  );
}
