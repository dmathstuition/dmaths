import { supabaseServer } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import MessagesClient from "@/components/portal/MessagesClient";

export const dynamic = "force-dynamic";

// Learner's conversation with the D-Maths team. Reached via the notification
// bell (not the sidebar). RLS limits the select to this learner's own thread.
export default async function StudentMessages() {
  const supa = supabaseServer();
  const me = await getProfile();
  const { data: messages } = await supa
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Messages</h1>
        <p className="text-sm text-ink/45">Chat directly with the D-Maths team.</p>
      </div>
      <MessagesClient meId={me?.id ?? ""} initialMessages={messages ?? []} />
    </div>
  );
}
