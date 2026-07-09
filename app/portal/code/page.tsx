import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PythonIde from "@/components/code/PythonIde";

export const dynamic = "force-dynamic";

// The learner's Python playground. Code runs entirely in their browser (Pyodide);
// saved snippets live in code_snippets (owner-scoped via RLS).
export default async function CodePage() {
  const user = await getUser();
  let snippets: any[] = [];
  if (user) {
    // Best-effort: table may not exist until migration-code-snippets.sql is run.
    const { data } = await supabaseAdmin()
      .from("code_snippets").select("id, title, code")
      .eq("user_id", user.id).order("updated_at", { ascending: false });
    snippets = data ?? [];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Code playground</h1>
        <p className="text-sm text-ink/45">
          Write and run real Python right here in your browser — then save your work to come back to it.
        </p>
      </div>
      <PythonIde persist meId={user?.id ?? ""} initialSnippets={snippets} />
    </div>
  );
}
