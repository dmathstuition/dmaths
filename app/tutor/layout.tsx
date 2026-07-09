import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import AssistantWidget from "@/components/portal/AssistantWidget";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Tutor Portal · D-Maths Tuition" };

const NAV: NavItem[] = [
  { href: "/tutor", label: "Dashboard", icon: "dashboard" },
  { href: "/tutor/classes", label: "My Classes", icon: "classes" },
  { href: "/tutor/calendar", label: "Calendar", icon: "calendar" },
  { href: "/tutor/learners", label: "My Learners", icon: "students" },
  { href: "/tutor/assignments", label: "Assignments", icon: "assignments" },
  { href: "/tutor/materials", label: "Materials", icon: "materials" },
  { href: "/tutor/code", label: "Code playground", icon: "code" },
  { href: "/tutor/math-lab", label: "Math Lab", icon: "sigma" },
  { href: "/tutor/messages", label: "Messages", icon: "messages" },
];

const TABS = [
  { href: "/tutor", label: "Home", icon: "home" as const },
  { href: "/tutor/classes", label: "Classes", icon: "classes" as const },
  { href: "/tutor/learners", label: "Learners", icon: "students" as const },
  { href: "/tutor/assignments", label: "Work", icon: "assignments" as const },
  { href: "/tutor/messages", label: "Chat", icon: "messages" as const },
];

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  // Admin is a superset and may view the tutor portal; anyone else is bounced.
  if (!p || (p.role !== "tutor" && p.role !== "admin")) {
    redirect("/login?gone=1");
  }
  return (
    <PortalShell nav={NAV} tabs={TABS} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle="Tutor"
      bell={{ mode: "student", noticesHref: "/tutor/messages" }} idleMinutes={60}>
      <AuthGuard />
      <ErrorBoundary>{children}</ErrorBoundary>
      <AssistantWidget mode="staff" />
    </PortalShell>
  );
}
