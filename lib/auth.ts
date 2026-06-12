import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Request-scoped, deduplicated auth.
 *
 * Problem this solves: middleware, layout, AND page each called
 * supabase.auth.getUser() — a network round trip to Supabase Auth —
 * on every single navigation. From West Africa that's 300-600ms each,
 * stacked sequentially = multi-second page loads.
 *
 * React's cache() dedupes within one server render: the layout and the
 * page now share ONE getUser() and ONE profile fetch per request.
 */
export const getUser = cache(async () => {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  return user;
});

export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supa = supabaseServer();
  const { data } = await supa.from("profiles").select("*").eq("id", user.id).single();
  return data;
});
