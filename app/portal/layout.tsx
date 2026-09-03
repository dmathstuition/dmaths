import PortalShell, { type NavItem } from "@/components/PortalShell";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import StreakHeartbeat from "@/components/portal/StreakHeartbeat";
import DailyTaskGuard from "@/components/portal/DailyTaskGuard";
import AssistantWidget from "@/components/portal/AssistantWidget";
import { AssistantProvider } from "@/components/portal/AssistantContext";
import { getProfile } from "@/lib/auth";
import { learnerAvatarFor } from "@/lib/avatars";
import { titleLabel } from "@/lib/cosmetics";
import { redirect } from "next/navigation";

// Portal navigation is focused on learning — classes, attendance, reports and
// tracks. Everything playful (games, challenges, leaderboards, rewards, avatar
// studio, labs) lives together in the Game Center (/portal/games), sourced from
// lib/gameCenter.ts.
const NAV: NavItem[] = [
  { href: "/portal", label: "Dashboard", icon: "dashboard" },
  { href: "/portal/games", label: "Game Center", icon: "trophy" },
  { href: "/portal/assistant", label: "D-Maths A.I", icon: "compass" },
  { href: "/portal/solve", label: "Question solver", icon: "sigma" },
  { href: "/portal/check", label: "Check my work", icon: "checkCircle" },
  { href: "/portal/classes", label: "My classes", icon: "classes" },
  { href: "/portal/aptitude", label: "Aptitude test", icon: "graduationCap" },
  { href: "/portal/assignments", label: "Assignments", icon: "assignments" },
  { href: "/portal/plan", label: "My plan", icon: "checkCircle" },
  { href: "/portal/messages", label: "Messages", icon: "messages" },
  { href: "/portal/materials", label: "Materials", icon: "materials" },
  { href: "/portal/curriculum", label: "Curriculum", icon: "curriculum" },
  { href: "/portal/practice", label: "Practice", icon: "target" },
  { href: "/portal/mock-exam", label: "Mock exam", icon: "graduationCap" },
  { href: "/portal/flashcards", label: "Revision cards", icon: "book" },
  { href: "/portal/progress", label: "My progress", icon: "progress" },
  { href: "/portal/report", label: "My report", icon: "reports" },
  { href: "/portal/calendar", label: "Calendar", icon: "calendar" },
  { href: "/portal/notices", label: "Notices", icon: "notices" },
  { href: "/portal/notifications", label: "Notifications", icon: "bell" },
  { href: "/portal/behavior", label: "My behaviour", icon: "checkCircle" },
  { href: "/portal/certificates", label: "Certificates", icon: "graduationCap" },
  { href: "/portal/report-cards", label: "Report cards", icon: "reports" },
  { href: "/portal/payments", label: "My payments", icon: "payments" },
  { href: "/portal/attendance", label: "Attendance", icon: "calendar" },
  { href: "/portal/profile", label: "Profile", icon: "profile" },
  { href: "/portal/help", label: "Help & support", icon: "helpCircle" },
];

// The 5 primary tabs shown in the mobile bottom bar (the rest live under "More").
const TABS = [
  { href: "/portal", label: "Home", icon: "home" as const },
  { href: "/portal/classes", label: "Learn", icon: "book" as const },
  { href: "/portal/games", label: "Games", icon: "trophy" as const },
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
      avatarSrc={learnerAvatarFor(p.id, (p as any).avatar_choice)}
      avatarTitle={titleLabel((p as any).avatar_title)}
      avatarHref="/portal/profile"
      bell={{ mode: "student", subjects, noticesHref: "/portal/notices" }}>
      <AuthGuard />
      <StreakHeartbeat />
      <DailyTaskGuard />
      <AssistantProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
        <AssistantWidget />
      </AssistantProvider>
    </PortalShell>
  );
}
