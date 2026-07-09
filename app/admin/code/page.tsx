import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Playground from "@/components/code/Playground";

export const dynamic = "force-dynamic";

// Admin code space — run Python or build web pages (e.g. to demo in class).
export default async function AdminCodePage() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("code_snippets").select("id, title, code, language")
        .eq("user_id", user.id).order("updated_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Code playground</h1>
        <p className="text-sm text-ink/50">Run Python or build a web page with HTML, CSS &amp; JavaScript.</p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={data ?? []} />
    </div>
  );
}
