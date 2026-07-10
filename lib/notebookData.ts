import { supabaseAdmin } from "@/lib/supabase/admin";

// Loads a user's own snippets/notebooks plus the pool of notebooks other staff
// have shared. The "shared" queries are guarded so the page keeps working before
// migration-shared-notebooks.sql has been run (the column simply doesn't exist yet).
export async function loadCodeData(userId?: string) {
  if (!userId) return { snippets: [] as any[], sharedNotebooks: [] as any[] };
  const admin = supabaseAdmin();

  const { data: snippets } = await admin
    .from("code_snippets").select("id, title, code, language")
    .eq("user_id", userId).order("updated_at", { ascending: false });

  let sharedNotebooks: any[] = [];
  const shared = await admin
    .from("code_snippets").select("id, title, code, shared_by_name")
    .eq("shared", true).eq("language", "notebook").neq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (!shared.error) sharedNotebooks = shared.data ?? [];

  // Mark which of the user's own notebooks are currently shared (for the toggle).
  let mySharedIds = new Set<string>();
  const own = await admin.from("code_snippets").select("id").eq("user_id", userId).eq("shared", true);
  if (!own.error) mySharedIds = new Set((own.data ?? []).map((r) => r.id));

  const withShared = (snippets ?? []).map((s) => (mySharedIds.has(s.id) ? { ...s, shared: true } : s));
  return { snippets: withShared, sharedNotebooks };
}
