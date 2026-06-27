import { supabaseServer } from "@/lib/supabase/server";
import PaymentsClient from "@/components/admin/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supa = supabaseServer();
  // The `payments` ledger is admin-readable via RLS. If the migration hasn't
  // been run yet the query errors — fall back to an empty list so the page
  // still renders with guidance instead of crashing.
  const { data } = await supa
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  return <PaymentsClient initial={data ?? []} />;
}
