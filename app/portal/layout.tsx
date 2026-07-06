import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import StreakHeartbeat from "@/components/portal/StreakHeartbeat";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

const NAV: NavItem[] = [
  { href: "/portal", label: "Dashboard", icon: "dashboard" },
  { href: "/portal/classes", label: "My classes", icon: "classes" },
  { href: "/portal/assignments", label: "Assignments", icon: "assignments" },
  { href: "/portal/messages", label: "Messages", icon: "messages" },
  { href: "/portal/materials", label: "Materials", icon: "materials" },
  { href: "/portal/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/portal/progress", label: "My progress", icon: "progress" },
  { href: "/portal/calendar", label: "Calendar", icon: "calendar" },
  { href: "/portal/notices", label: "Notices", icon: "notices" },
  { href: "/portal/behavior", label: "My behaviour", icon: "checkCircle" },
  { href: "/portal/badges", label: "Badges", icon: "trophy" },
  { href: "/portal/leaderboard", label: "Leaderboard", icon: "students" },
  { href: "/portal/attendance", label: "Attendance", icon: "calendar" },
  { href: "/portal/profile", label: "Profile", icon: "profile" },
];

// The 5 primary tabs shown in the mobile bottom bar (the rest live under "More").
const TABS = [
  { href: "/portal", label: "Home", icon: "home" as const },
  { href: "/portal/classes", label: "Learn", icon: "book" as const },
  { href: "/portal/progress", label: "Progress", icon: "progress" as const },
  { href: "/portal/messages", label: "Messages", icon: "messages" as const },
  { href: "/portal/profile", label: "Profile", icon: "profile" as const },
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
    <PortalShell nav={NAV} tabs={TABS} name={`${p.first_name ?? ""} ${p.last_name ?? ""}`}
      subtitle={p.student_code ?? "Student"}
      bell={{ mode: "student", subjects, noticesHref: "/portal/notices" }}>
      <AuthGuard />
      <StreakHeartbeat />
      <ErrorBoundary>{children}</ErrorBoundary>
    </PortalShell>
  );
}
