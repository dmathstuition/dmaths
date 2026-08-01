import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MathLab from "@/components/math/MathLab";
import PageHero from "@/components/portal/PageHero";

export const dynamic = "force-dynamic";

export default async function TutorMathLab() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("code_snippets").select("id, title, code")
        .eq("user_id", user.id).eq("language", "math").order("updated_at", { ascending: false })
    : { data: [] };
  return (
    <div className="space-y-5 py-2">
      <PageHero icon="sigma" title="Math Lab" decor={["flask", "sigma"]}
        subtitle="Work out formulas live with unit support — handy for prepping worked examples." />
      <MathLab persist meId={user?.id ?? ""} initialSheets={data ?? []} />
    </div>
  );
}
