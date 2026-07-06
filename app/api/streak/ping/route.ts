import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Called once per day when a learner opens their portal. Advances the
// consecutive-day streak: +1 if they were here yesterday, reset to 1 after a
// gap, unchanged if already counted today.
export async function POST() {
  const supa = supabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: me } = await admin
    .from("profiles").select("streak_count, streak_last_date, role").eq("id", user.id).single();
  if (!me || me.role !== "student") return NextResponse.json({ ok: true, streak: 0 });

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const today = day(new Date());
  const yesterday = day(new Date(Date.now() - 86_400_000));
  const last = me.streak_last_date ? String(me.streak_last_date).slice(0, 10) : null;

  if (last === today) return NextResponse.json({ ok: true, streak: me.streak_count ?? 0 });

  const streak = last === yesterday ? (me.streak_count ?? 0) + 1 : 1;
  await admin.from("profiles").update({ streak_count: streak, streak_last_date: today }).eq("id", user.id);
  return NextResponse.json({ ok: true, streak });
}
