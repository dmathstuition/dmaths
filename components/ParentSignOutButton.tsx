"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ParentSignOutButton() {
  const router = useRouter();
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }
  return (
    <button onClick={signOut}
      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white">
      Sign out
    </button>
  );
}
