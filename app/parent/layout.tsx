import { redirect } from "next/navigation";
import PortalShell, { type NavItem } from "@/components/PortalShell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Parent Portal · D-Maths Tuition" };

const NAV: NavItem[] = [
  { href: "/parent", label: "Overview", icon: "dashboard" },
  { href: "/parent/calendar", label: "Class calendar", icon: "calendar" },
  { href: "/parent/attendance", label: "Attendance", icon: "checkCircle" },
  { href: "/parent/payments", label: "Payments", icon: "payments" },
  { href: "/parent/messages", label: "Messages", icon: "messages" },
];

// The 4 primary tabs for the mobile bottom bar (the rest live under "More").
const TABS = [
  { href: "/parent", label: "Home", icon: "home" as const },
  { href: "/parent/calendar", label: "Classes", icon: "calendar" as const },
  { href: "/parent/payments", label: "Payments", icon: "payments" as const },
  { href: "/parent/messages", label: "Messages", icon: "messages" as const },
];

// Parents now use the same shell as every other portal, so they inherit the
// nav, ⌘K palette, mobile tab bar, notification bell and idle logout.
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supa
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") redirect("/login");

  return (
    <PortalShell
      nav={NAV}
      tabs={TABS}
      name={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Parent"}
      subtitle="Parent Portal"
      bell={{ mode: "student", noticesHref: "/parent" }}
    >
      <ErrorBoundary home="/parent">{children}</ErrorBoundary>
    </PortalShell>
  );
}
