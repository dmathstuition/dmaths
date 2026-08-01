import { getUser } from "@/lib/auth";
import Playground from "@/components/code/Playground";
import { loadCodeData } from "@/lib/notebookData";
import PageHero from "@/components/portal/PageHero";

export const dynamic = "force-dynamic";

// Tutors get the same code space as learners — handy for preparing examples and
// sharing starter notebooks with their learners.
export default async function TutorCodePage() {
  const user = await getUser();
  const { snippets, sharedNotebooks } = await loadCodeData(user?.id);

  return (
    <div className="space-y-5 py-2">
      <PageHero icon="code" title="Code playground" decor={["code", "sparkles"]}
        subtitle="Run Python, build a web page, or make a Colab-style notebook — and share starter notebooks with your learners." />
      <Playground persist meId={user?.id ?? ""} snippets={snippets} sharedNotebooks={sharedNotebooks} canShare />
    </div>
  );
}
