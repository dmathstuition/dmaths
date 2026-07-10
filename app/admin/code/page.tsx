import { getUser } from "@/lib/auth";
import Playground from "@/components/code/Playground";
import { loadCodeData } from "@/lib/notebookData";

export const dynamic = "force-dynamic";

// Admin code space — run Python or build web pages (e.g. to demo in class), and
// share starter notebooks with learners.
export default async function AdminCodePage() {
  const user = await getUser();
  const { snippets, sharedNotebooks } = await loadCodeData(user?.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Code playground</h1>
        <p className="text-sm text-ink/50">Run Python, build a web page, or make a Colab-style notebook — and share starter notebooks with learners.</p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={snippets} sharedNotebooks={sharedNotebooks} canShare />
    </div>
  );
}
