import { redirect, notFound } from "next/navigation";
import Logo from "@/components/Logo";
import CertificateActions from "@/components/CertificateActions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUser, getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report card — D-Maths", robots: { index: false } };

function grade(avg: number) {
  if (avg >= 90) return { band: "A*", label: "Distinction", color: "#059669" };
  if (avg >= 80) return { band: "A", label: "Excellent", color: "#059669" };
  if (avg >= 70) return { band: "B", label: "Very good", color: "#1A60AB" };
  if (avg >= 60) return { band: "C", label: "Good", color: "#1A60AB" };
  if (avg >= 50) return { band: "D", label: "Fair", color: "#C8881F" };
  return { band: "E", label: "Needs improvement", color: "#EF4444" };
}

export default async function ReportCardPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const me = await getProfile();

  const admin = supabaseAdmin();
  const { data: card } = await admin
    .from("report_cards")
    .select("id, student_id, term, avg_score, attendance, reward_points, sanction_points, remark, serial, issued_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!card) notFound();

  // Authorise: the learner themselves, staff, or a linked parent.
  let allowed = me?.role === "admin" || me?.role === "tutor" || card.student_id === user.id;
  if (!allowed && me?.role === "parent") {
    const { data: link } = await admin.from("parent_student_links")
      .select("student_id").eq("parent_id", user.id).eq("student_id", card.student_id).maybeSingle();
    allowed = !!link;
  }
  if (!allowed) notFound();

  const { data: student } = await admin.from("profiles")
    .select("first_name, last_name, student_code, level").eq("id", card.student_id).maybeSingle();
  const name = `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || "Student";

  const backHref = me?.role === "admin" || me?.role === "tutor" ? "/admin/report-cards"
    : me?.role === "parent" ? "/parent" : "/portal/report-cards";
  const issued = new Date(card.issued_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
  const g = grade(card.avg_score ?? 0);
  const net = (card.reward_points ?? 0) - (card.sanction_points ?? 0);

  const stats = [
    { label: "Average score", value: `${card.avg_score ?? 0}%`, color: "#059669" },
    { label: "Attendance", value: `${card.attendance ?? 0}%`, color: "#1A60AB" },
    { label: "Reward points", value: `+${card.reward_points ?? 0}`, color: "#C8881F" },
    { label: "Conduct (net)", value: `${net >= 0 ? "+" : ""}${net}`, color: net >= 0 ? "#059669" : "#EF4444" },
  ];

  return (
    <div className="min-h-screen bg-chalk py-8 print:bg-white print:py-0">
      <div className="cert-sheet mx-auto max-w-3xl bg-white px-6 py-8 shadow-2xl sm:px-12 sm:py-10 print:max-w-none print:shadow-none">
        {/* header */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-board pb-5">
          <Logo size="lg" />
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-board sm:text-3xl">Progress Report</h1>
            <p className="text-sm font-semibold text-gold-deep">{card.term}</p>
          </div>
        </div>

        {/* student */}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Field label="Student" value={name} />
          <Field label="Student ID" value={student?.student_code ?? "—"} />
          <Field label="Class / Level" value={student?.level ?? "—"} />
        </div>

        {/* stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl border border-line p-4 text-center">
              <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* grade band */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-chalk px-5 py-3">
          <p className="text-sm font-semibold text-ink/60">Overall grade</p>
          <p className="font-display text-xl font-extrabold" style={{ color: g.color }}>
            {g.band} <span className="text-sm font-semibold">· {g.label}</span>
          </p>
        </div>

        {/* remark */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Tutor&apos;s remark</p>
          <p className="mt-1 min-h-[64px] rounded-xl border border-line p-4 text-sm leading-relaxed text-ink/75">
            {card.remark || "—"}
          </p>
        </div>

        {/* footer */}
        <div className="mt-8 flex items-end justify-between gap-6">
          <div>
            <p className="font-display text-base font-bold text-ink">{issued}</p>
            <div className="mt-1 w-40 border-t border-ink/30" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Date issued</p>
          </div>
          <div className="text-right">
            <p className="font-display text-base font-bold text-board">D-Maths</p>
            <div className="mt-1 ml-auto w-40 border-t border-ink/30" />
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">Authorised signature</p>
          </div>
        </div>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-ink/35">Report No. {card.serial}</p>
      </div>

      <CertificateActions backHref={backHref} />

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          .no-print { display: none !important; }
          .cert-sheet { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
      <p className="font-display text-base font-bold text-ink">{value}</p>
    </div>
  );
}
