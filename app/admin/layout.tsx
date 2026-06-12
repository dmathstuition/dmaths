import PortalShell, { type NavItem } from "@/components/PortalShell";
import { getProfile } from "@/lib/auth";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/applications", label: "Applications", icon: "applications" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/classes", label: "Classes", icon: "classes" },
  { href: "/admin/assignments", label: "Assignments", icon: "assignments" },
  { href: "/admin/materials", label: "Materials", icon: "materials" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
  { href: "/admin/notices", label: "Announcements", icon: "notices" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle="Administrator">
      {children}
    </PortalShell>
  );
}
