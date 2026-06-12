import PortalShell, { type NavItem } from "@/components/PortalShell";
import { getProfile } from "@/lib/auth";

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
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle={p?.student_code ?? "Student"}>
      {children}
    </PortalShell>
  );
}
