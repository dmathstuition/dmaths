import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MathLab from "@/components/math/MathLab";

export const dynamic = "force-dynamic";

export default async function AdminMathLab() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("code_snippets").select("id, title, code")
        .eq("user_id", user.id).eq("language", "math").order("updated_at", { ascending: false })
    : { data: [] };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Math Lab</h1>
        <p className="text-sm text-ink/50">Type any formula and see it rendered and solved live, with unit support.</p>
      </div>
      <MathLab persist meId={user?.id ?? ""} initialSheets={data ?? []} />
    </div>
  );
}
