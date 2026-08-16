import type { supabaseAdmin } from "@/lib/supabase/admin";

// Happy Hour — an admin-triggered window during which the grind earns (practice,
// mocks, flashcards) pay double. Stored as a single app_settings row
// ('happy_hour_until' = ISO timestamp). Pure check + a tiny server reader.

export const HAPPY_HOUR_MULT = 2;
export const HAPPY_HOUR_KEY = "happy_hour_until";

export function happyHourActive(until: string | null | undefined, now: Date = new Date()): boolean {
  return !!until && new Date(until).getTime() > now.getTime();
}

// Read the current window (null when unset or the table isn't migrated).
export async function readHappyHourUntil(admin: ReturnType<typeof supabaseAdmin>): Promise<string | null> {
  const { data } = await admin.from("app_settings").select("value").eq("key", HAPPY_HOUR_KEY).maybeSingle();
  return (data as any)?.value ?? null;
}

// The point multiplier from Happy Hour alone (2 while active, else 1).
export async function happyHourMultiplier(admin: ReturnType<typeof supabaseAdmin>): Promise<number> {
  return happyHourActive(await readHappyHourUntil(admin)) ? HAPPY_HOUR_MULT : 1;
}
