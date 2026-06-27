// SERVER ONLY — Paystack helpers. Never import in a client component
// (this reads PAYSTACK_SECRET_KEY).
import { SUMMER_CAMP_TIERS } from "@/lib/summerCamp";

export interface PaystackTxn {
  status: string;
  reference: string;
  amount: number;        // kobo
  currency: string;
  channel?: string;
  paid_at?: string;
  customer?: { email?: string };
  metadata?: { plan?: string; camp?: string; applicationId?: string;[k: string]: any };
}

export function paystackSecret(): string {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

// Expected naira price for a camp package. Returns 0 for non-camp payments
// (regular enrolments have no fixed server-side price).
export function expectedNgnForPlan(plan?: string | null): number {
  if (!plan) return 0;
  const tier = SUMMER_CAMP_TIERS.find((t) => t.id === plan);
  return tier ? tier.ngn : 0;
}

// Ask Paystack's API whether a reference genuinely succeeded. The secret key
// never leaves the server, so this cannot be spoofed by the browser.
export async function verifyTransaction(
  reference: string,
): Promise<{ ok: boolean; data?: PaystackTxn; error?: string }> {
  const secret = paystackSecret();
  if (!secret) return { ok: false, error: "Payments not configured" };

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
  );
  const json = await res.json();

  if (!json.status || json.data?.status !== "success") {
    return { ok: false, error: "Payment not successful", data: json.data };
  }
  return { ok: true, data: json.data as PaystackTxn };
}

// Idempotent upsert into the authoritative ledger. Pass a service-role client.
export async function recordPayment(admin: any, data: PaystackTxn): Promise<void> {
  const meta = data.metadata || {};
  await admin.from("payments").upsert(
    {
      reference: data.reference,
      email: (data.customer?.email ?? "").toLowerCase(),
      amount: (data.amount ?? 0) / 100,
      currency: data.currency ?? "NGN",
      channel: data.channel ?? "",
      plan: meta.plan ?? "",
      camp: meta.camp ?? "",
      status: data.status,
      paid_at: data.paid_at ?? null,
      raw: data as any,
    },
    { onConflict: "reference" },
  );
}
