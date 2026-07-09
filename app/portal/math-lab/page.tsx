import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MathLab from "@/components/math/MathLab";

export const dynamic = "force-dynamic";

// Live maths playground — type any formula and see it rendered and worked out,
// with real unit support. Saved sheets reuse code_snippets (language="math").
export default async function MathLabPage() {
  const user = await getUser();
  let sheets: any[] = [];
  if (user) {
    const { data } = await supabaseAdmin()
      .from("code_snippets").select("id, title, code")
      .eq("user_id", user.id).eq("language", "math").order("updated_at", { ascending: false });
    sheets = data ?? [];
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Math Lab</h1>
        <p className="text-sm text-ink/45">
          Type any formula and watch it render and solve live — powers, roots, trig, and even units and conversions.
        </p>
      </div>
      <MathLab persist meId={user?.id ?? ""} initialSheets={sheets} />
    </div>
  );
}
