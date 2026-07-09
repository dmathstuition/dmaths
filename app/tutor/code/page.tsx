import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Playground from "@/components/code/Playground";

export const dynamic = "force-dynamic";

// Tutors get the same code space as learners — handy for preparing examples.
export default async function TutorCodePage() {
  const user = await getUser();
  const { data } = user
    ? await supabaseAdmin().from("code_snippets").select("id, title, code, language")
        .eq("user_id", user.id).order("updated_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-bold">Code playground</h1>
        <p className="text-sm text-ink/50">Run Python or build a web page — great for prepping live examples for your learners.</p>
      </div>
      <Playground persist meId={user?.id ?? ""} snippets={data ?? []} />
    </div>
  );
}
