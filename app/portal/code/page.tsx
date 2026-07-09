import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Playground from "@/components/code/Playground";

export const dynamic = "force-dynamic";

// The learner's code space — Python (runs in the browser via Pyodide) and a
// Web (HTML/CSS/JS) live editor. Saved snippets are owner-scoped via RLS.
export default async function CodePage() {
  const user = await getUser();
  let snippets: any[] = [];
  if (user) {
    const { data } = await supabaseAdmin()
      .from("code_snippets").select("id, title, code, language")
      .eq("user_id", user.id).order("updated_at", { ascending: false });
    snippets = data ?? [];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Code playground</h1>
        <p className="text-sm text-ink/45">
          Write and run real code right in your browser — Python, or build a web page with HTML, CSS &amp; JavaScript. Save your work to come back to it.
        </p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={snippets} />
    </div>
  );
}
