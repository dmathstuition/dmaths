import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MathLab from "@/components/math/MathLab";

export const dynamic = "force-dynamic";

export default async function TutorMathLab() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("code_snippets").select("id, title, code")
        .eq("user_id", user.id).eq("language", "math").order("updated_at", { ascending: false })
    : { data: [] };
  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">Math Lab</h1>
        <p className="text-sm text-ink/50">Work out formulas live with unit support — handy for prepping worked examples.</p>
      </div>
      <MathLab persist meId={user?.id ?? ""} initialSheets={data ?? []} />
    </div>
  );
}
