import { supabaseServer } from "@/lib/supabase/server";
import PaymentsClient from "@/components/admin/PaymentsClient";
import Tour from "@/components/tour/Tour";
import { paymentsTour } from "@/components/tour/steps";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const supa = supabaseServer();
  // The `payments` ledger is admin-readable via RLS. If the migration hasn't
  // been run yet the query errors — fall back to an empty list so the page
  // still renders with guidance instead of crashing.
  const [{ data }, { data: subscribers }, { data: receipts }] = await Promise.all([
    supa.from("payments").select("*").order("created_at", { ascending: false }).limit(1000),
    // Monthly subscribers (errors harmlessly to null before the migration runs).
    supa.from("profiles")
      .select("id, first_name, last_name, email, sub_amount, sub_due_date")
      .eq("role", "student").eq("sub_active", true)
      .order("sub_due_date", { ascending: true }),
    // Which payments already have a receipt (null before migration-receipts.sql).
    supa.from("receipts").select("id, serial, payment_reference"),
  ]);

  return (
    <>
      <PaymentsClient initial={data ?? []} subscribers={subscribers ?? []} receipts={receipts ?? []} />
      <Tour tourId="admin-payments" steps={paymentsTour} />
    </>
  );
}
