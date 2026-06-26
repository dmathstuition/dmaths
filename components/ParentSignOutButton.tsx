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
    <button onClick={signOut} className="font-semibold text-gold-deep hover:underline text-sm">
      Sign out
    </button>
  );
}
