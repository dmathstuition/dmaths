import { supabaseServer } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/applications", label: "Applications", icon: "✓" },
  { href: "/admin/students", label: "Students", icon: "👥" },
  { href: "/admin/classes", label: "Classes", icon: "▶" },
  { href: "/admin/assignments", label: "Assignments", icon: "✎" },
  { href: "/admin/materials", label: "Materials", icon: "📄" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "📋" },
  { href: "/admin/reports", label: "Reports", icon: "📊" },
  { href: "/admin/calendar", label: "Calendar", icon: "📅" },
  { href: "/admin/notices", label: "Announcements", icon: "🔔" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: p } = await supa.from("profiles").select("first_name,last_name").eq("id", user!.id).single();
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle="Administrator">
      {children}
    </PortalShell>
  );
}
