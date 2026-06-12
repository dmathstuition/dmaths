import PortalShell from "@/components/PortalShell";
import { getProfile } from "@/lib/auth";

const NAV = [
  { href: "/portal", label: "Dashboard", icon: "▦" },
  { href: "/portal/classes", label: "My classes", icon: "▶" },
  { href: "/portal/assignments", label: "Assignments", icon: "✎" },
  { href: "/portal/materials", label: "Materials", icon: "📄" },
  { href: "/portal/curriculum", label: "Curriculum", icon: "📋" },
  { href: "/portal/progress", label: "My progress", icon: "📊" },
  { href: "/portal/calendar", label: "Calendar", icon: "📅" },
  { href: "/portal/notices", label: "Notices", icon: "🔔" },
  { href: "/portal/profile", label: "Profile", icon: "👤" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle={p?.student_code ?? "Student"}>
      {children}
    </PortalShell>
  );
}
