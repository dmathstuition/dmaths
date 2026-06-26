import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ParentSignOutButton from "@/components/ParentSignOutButton";

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
    <div className="min-h-screen bg-chalk">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <p className="font-display text-lg font-semibold text-ink">
            D-Maths Tuition{" "}
            <span className="ml-2 text-xs font-normal text-ink/40">Parent Portal</span>
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink/55 sm:block">{profile.first_name}</span>
            <ParentSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
