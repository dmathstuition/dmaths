import { getUser } from "@/lib/auth";
import Playground from "@/components/code/Playground";
import { loadCodeData } from "@/lib/notebookData";

export const dynamic = "force-dynamic";

// The learner's code space — Python (runs in the browser via Pyodide) and a
// Web (HTML/CSS/JS) live editor. Saved snippets are owner-scoped via RLS.
export default async function CodePage() {
  const user = await getUser();
  const { snippets, sharedNotebooks } = await loadCodeData(user?.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Code playground</h1>
        <p className="text-sm text-ink/45">
          Write and run real code right in your browser — Python, a Colab-style notebook with plots &amp; tables, or build a web page with HTML, CSS &amp; JavaScript. Save your work to come back to it.
        </p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={snippets} sharedNotebooks={sharedNotebooks} />
    </div>
  );
}
