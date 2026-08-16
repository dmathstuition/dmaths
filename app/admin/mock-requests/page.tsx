import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import MockRequestsClient from "@/components/admin/MockRequestsClient";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mock requests · D-Maths" };

export default async function AdminMockRequestsPage() {
  const supa = supabaseServer();
  const { data: students } = await supa
    .from("profiles")
    .select("id, first_name, last_name, student_code, level")
    .eq("role", "student").eq("is_active", true)
    .order("first_name", { ascending: true })
    .limit(2000);
  return (
    <div className="space-y-4">
      <Link href="/admin/mock-exams"
        className="card flex items-center gap-3 border-l-4 border-l-gold bg-gold-pale/40 p-4 transition hover:bg-gold-pale/70">
        <Icon name="sparkles" className="h-5 w-5 flex-shrink-0 text-gold-deep" />
        <p className="text-sm text-ink/75">
          <strong className="text-ink">Setting the questions?</strong> Mocks draw from the question bank — generate a WAEC/JAMB paper on <span className="font-bold text-gold-deep">Mock exams</span>. →
        </p>
      </Link>
      <MockRequestsClient students={(students ?? []) as any} />
    </div>
  );
}
