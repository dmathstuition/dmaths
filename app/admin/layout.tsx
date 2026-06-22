import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  { href: "/admin/activity", label: "Activity", icon: "reports" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  if (!p || p.role !== "admin") {
    redirect("/login?gone=1");
  }
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle="Administrator"
      bell={{ mode: "admin", noticesHref: "/admin/applications" }}>
      <AuthGuard />
      <ErrorBoundary>{children}</ErrorBoundary>
    </PortalShell>
  );
}
