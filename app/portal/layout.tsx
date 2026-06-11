import { supabaseServer } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";

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
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  const { data: p } = await supa.from("profiles").select("first_name,last_name,student_code").eq("id", user!.id).single();
  return (
    <PortalShell nav={NAV} name={`${p?.first_name ?? ""} ${p?.last_name ?? ""}`} subtitle={p?.student_code ?? "Student"}>
      {children}
    </PortalShell>
  );
}
