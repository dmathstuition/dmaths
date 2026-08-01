import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MessagesClient from "@/components/portal/MessagesClient";
import PageHero from "@/components/portal/PageHero";

export const dynamic = "force-dynamic";

// The tutor's direct thread with the D-Maths admin. The thread key is the
// tutor's own id, so the learner MessagesClient (sends as the thread owner,
// receives 'admin') works unchanged — the send route accepts the tutor branch.
export default async function TutorMessages() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { data: messages } = await supabaseAdmin()
    .from("messages").select("*")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4 py-2">
      <PageHero icon="messages" title="Messages" decor={["messages"]}
        subtitle="Chat directly with the D-Maths admin." />
      <MessagesClient meId={user.id} initialMessages={messages ?? []} />
    </div>
  );
}
