// Shared guard for parent pages: resolves the signed-in parent and the children
// they are actually linked to. Every parent page must go through this before
// touching child data with the service-role client, so a parent can never read
// another family's records.
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ParentChild = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  student_code: string | null;
  email: string | null;
  guardian_email: string | null;
};

export async function getParentChildren(): Promise<{ parentId: string; children: ParentChild[] } | null> {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;

  const { data: me } = await supa.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "parent") return null;

  const admin = supabaseAdmin();
  const { data: links } = await admin
    .from("parent_student_links").select("student_id").eq("parent_id", user.id);
  const ids = (links ?? []).map((l: any) => l.student_id);
  if (!ids.length) return { parentId: user.id, children: [] };

  const { data: children } = await admin
    .from("profiles")
    .select("id, first_name, last_name, student_code, email, guardian_email")
    .in("id", ids);

  return { parentId: user.id, children: (children ?? []) as ParentChild[] };
}

export const childName = (c: ParentChild) =>
  `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.student_code || "Your child";
