import { getUser } from "@/lib/auth";
import Playground from "@/components/code/Playground";
import { loadCodeData } from "@/lib/notebookData";

export const dynamic = "force-dynamic";

// Tutors get the same code space as learners — handy for preparing examples and
// sharing starter notebooks with their learners.
export default async function TutorCodePage() {
  const user = await getUser();
  const { snippets, sharedNotebooks } = await loadCodeData(user?.id);

  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">Code playground</h1>
        <p className="text-sm text-ink/50">Run Python, build a web page, or make a Colab-style notebook — and share starter notebooks with your learners.</p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={snippets} sharedNotebooks={sharedNotebooks} canShare />
    </div>
  );
}
