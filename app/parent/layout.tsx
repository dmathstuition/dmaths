import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ParentSignOutButton from "@/components/ParentSignOutButton";
import Logo from "@/components/Logo";
import IdleLogout from "@/components/IdleLogout";

export const metadata = { title: "Parent Portal · D-Maths Tuition" };

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supa
    .from("profiles")
    .select("role, first_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent") redirect("/login");

  return (
    <div className="portal-bg min-h-screen">
      <header className="glass-dark sticky top-0 z-40 px-5 py-3.5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo light />
            <span className="hidden rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/60 sm:inline">Parent Portal</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden font-semibold text-white/70 sm:block">Hi, {profile.first_name} 👋</span>
            <ParentSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <IdleLogout />
    </div>
  );
}
