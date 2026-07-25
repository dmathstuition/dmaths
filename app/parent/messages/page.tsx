import { Icon } from "@/components/Icons";
import MessagesClient from "@/components/portal/MessagesClient";
import { getParentChildren } from "@/lib/parentAccess";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// The parent's own thread with the D-Maths team. Keyed by the parent's id
// (mirroring how a tutor's admin thread works), so nothing a parent writes
// ever appears in their child's inbox.
export default async function ParentMessagesPage() {
  const ctx = await getParentChildren();
  if (!ctx) return null;

  const { data: messages } = await supabaseAdmin()
    .from("messages")
    .select("*")
    .eq("student_id", ctx.parentId)
    .is("tutor_id", null)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold ring-1 ring-gold/25">
          <Icon name="messages" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-white/50">Talk to the D-Maths team about your child's progress.</p>
        </div>
      </div>

      <MessagesClient meId={ctx.parentId} initialMessages={(messages ?? []) as any[]} myRole="parent" />
    </div>
  );
}
