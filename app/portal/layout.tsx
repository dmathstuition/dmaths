import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

const NAV: NavItem[] = [
  { href: "/portal", label: "Dashboard", icon: "dashboard" },
  { href: "/portal/classes", label: "My classes", icon: "classes" },
  { href: "/portal/assignments", label: "Assignments", icon: "assignments" },
  { href: "/portal/materials", label: "Materials", icon: "materials" },
  { href: "/portal/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/portal/progress", label: "My progress", icon: "progress" },
  { href: "/portal/calendar", label: "Calendar", icon: "calendar" },
  { href: "/portal/notices", label: "Notices", icon: "notices" },
  { href: "/portal/profile", label: "Profile", icon: "profile" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();

  // No profile = deleted/orphaned account, or not provisioned. Deny access.
  // Inactive students are also bounced. /login?gone=1 lets the login page
  // clear the stale session client-side.
  if (!p || p.role !== "student" || p.is_active === false) {
    redirect("/login?gone=1");
  }

  const subjects = p?.subjects ?? [];
  return (
    <PortalShell nav={NAV} name={`${p.first_name ?? ""} ${p.last_name ?? ""}`}
      subtitle={p.student_code ?? "Student"}
      bell={{ mode: "student", subjects, noticesHref: "/portal/notices" }}>
      <AuthGuard />
      {children}
    </PortalShell>
  );
}
