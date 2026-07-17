import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import AssistantWidget from "@/components/portal/AssistantWidget";
import { AssistantProvider } from "@/components/portal/AssistantContext";
import { getProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/applications", label: "Applications", icon: "applications" },
  { href: "/admin/payments", label: "Payments", icon: "payments" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/tutors", label: "Tutors", icon: "profile" },
  { href: "/admin/classes", label: "Classes", icon: "classes" },
  { href: "/admin/attendance", label: "Attendance", icon: "calendar" },
  { href: "/admin/assignments", label: "Assignments", icon: "assignments" },
  { href: "/admin/materials", label: "Materials", icon: "materials" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/admin/code", label: "Code playground", icon: "code" },
  { href: "/admin/math-lab", label: "Math Lab", icon: "sigma" },
  { href: "/admin/reports", label: "Reports", icon: "reports" },
  { href: "/admin/calendar", label: "Calendar", icon: "calendar" },
  { href: "/admin/notices", label: "Announcements", icon: "notices" },
  { href: "/admin/activity", label: "Activity", icon: "reports" },
  { href: "/admin/behavior", label: "Behaviour", icon: "checkCircle" },
  { href: "/admin/ratings", label: "Feedback", icon: "thumbsUp" },
  { href: "/admin/security", label: "Security", icon: "lock" },
];

// Primary mobile tabs (the rest live under "More").
const TABS = [
  { href: "/admin", label: "Home", icon: "home" as const },
  { href: "/admin/applications", label: "Applications", icon: "applications" as const },
  { href: "/admin/students", label: "Students", icon: "students" as const },
  { href: "/admin/classes", label: "Classes", icon: "classes" as const },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  if (!p || p.role !== "admin") {
    redirect("/login?gone=1");
  }
  // If this admin has 2FA enrolled but the session is only password-level (aal1),
  // force a step-up: no admin page loads until the code is verified (aal2).
  const { data: aal } = await supabaseServer().auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    redirect("/login?mfa=1");
  }
  return (
    <PortalShell nav={NAV} tabs={TABS} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle="Administrator"
      bell={{ mode: "admin", noticesHref: "/admin/applications" }} search idleMinutes={120}>
      <AuthGuard />
      <AssistantProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
        <AssistantWidget mode="staff" />
      </AssistantProvider>
    </PortalShell>
  );
}
