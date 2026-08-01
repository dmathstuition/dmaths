import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MathLab from "@/components/math/MathLab";
import { Icon } from "@/components/Icons";

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
      <div className="relative flex items-center gap-4 overflow-hidden rounded-3xl p-7 text-white"
        style={{ background: "linear-gradient(135deg, #10406F 0%, #0A2A4F 55%, #071C36 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(239,174,86,.4), transparent 70%)" }} />
        <div aria-hidden className="pointer-events-none absolute right-6 top-6 text-gold/30 float"><Icon name="flask" className="h-6 w-6" /></div>
        <div aria-hidden className="pointer-events-none absolute right-24 bottom-6 text-gold/25 float" style={{ animationDelay: "1.1s" }}><Icon name="sigma" className="h-5 w-5" /></div>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="sigma" className="h-6 w-6" />
        </span>
        <div className="relative">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Math Lab</h1>
          <p className="mt-1 text-sm text-white/50">
            Type any formula and watch it render and solve live — powers, roots, trig, and even units and conversions.
          </p>
        </div>
      </div>
      <MathLab persist meId={user?.id ?? ""} initialSheets={sheets} />
    </div>
  );
}
