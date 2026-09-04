"use client";
import { useState } from "react";
import { Icon, type IconName } from "@/components/Icons";
import GuardianClient from "@/components/guardian/GuardianClient";
import AptitudeParentCard from "@/components/guardian/AptitudeParentCard";
import { fmtNaira, type OwingSummary } from "@/lib/payments";

type Tab = "overview" | "attendance" | "payments" | "report";

const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-NG", { dateStyle: "medium" });

export default function GuardianPortalClient({
  student, behaviorLogs, gradedSubs, pendingCount, reportCards, attendance, payments, owing, aptitude,
}: {
  student: any; behaviorLogs: any[]; gradedSubs: any[]; pendingCount: number; reportCards: any[];
  attendance: { session_date: string; present: boolean; late?: boolean }[];
  payments: { reference: string; amount: number; channel?: string; paid_at?: string; created_at?: string }[];
  owing: OwingSummary;
  aptitude: any | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const childName = `${student.first_name ?? ""}`.trim() || "your child";

  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "attendance", label: "Attendance", icon: "checkCircle" },
    { id: "payments", label: "Payments", icon: "payments" },
    ...(aptitude ? [{ id: "report" as Tab, label: "Aptitude", icon: "graduationCap" as IconName }] : []),
  ];

  const presentCount = attendance.filter((a) => a.present).length;

  return (
    <div className="space-y-5">
      {/* Tab bar — the navigation this portal was missing */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-line bg-white p-1.5 shadow-sm">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              tab === t.id ? "bg-board text-white shadow" : "text-ink/60 hover:bg-chalk"}`}>
            <Icon name={t.icon} className="h-4 w-4" /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          <GuardianClient
            student={student}
            behaviorLogs={behaviorLogs}
            gradedSubs={gradedSubs}
            pendingCount={pendingCount}
            reportCards={reportCards}
          />
        </div>
      )}

      {tab === "attendance" && (
        <div className="card neu-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-ink">Attendance</h2>
            <span className="text-sm font-bold text-emerald-600">{presentCount}/{attendance.length} present</span>
          </div>
          {attendance.length ? (
            <div className="divide-y divide-line/60">
              {attendance.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                    a.present ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                    <Icon name={a.present ? "checkCircle" : "close"} className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink">{fmtDate(a.session_date)}</span>
                  <span className={`text-xs font-bold ${a.present ? "text-emerald-600" : "text-red-500"}`}>
                    {a.present ? (a.late ? "Present · late" : "Present") : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          ) : <p className="p-6 text-center text-sm text-ink/40">No attendance recorded yet.</p>}
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-4">
          <div className={`card neu-card p-5 ${owing.state === "overdue" ? "border-l-4 border-l-red-500" : owing.state === "owing" ? "border-l-4 border-l-amber-400" : ""}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">This month</p>
            {owing.hasPlan ? (
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {owing.owing > 0
                  ? <>{fmtNaira(owing.owing)} due{owing.dueDate ? ` by ${fmtDate(owing.dueDate)}` : ""}</>
                  : "Paid up — thank you!"}
              </p>
            ) : <p className="mt-1 text-sm text-ink/55">No outstanding balance on record.</p>}
          </div>
          <div className="card neu-card overflow-hidden">
            <div className="border-b border-line px-6 py-4"><h2 className="font-display text-lg font-semibold text-ink">Payment history</h2></div>
            {payments.length ? (
              <div className="divide-y divide-line/60">
                {payments.map((p) => (
                  <div key={p.reference} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="checkCircle" className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{fmtNaira(Number(p.amount || 0))}</p>
                      <p className="text-xs text-ink/50">{fmtDate(p.paid_at || p.created_at || "")}{p.channel ? ` · ${p.channel}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="p-6 text-center text-sm text-ink/40">No payments recorded yet.</p>}
          </div>
        </div>
      )}

      {tab === "report" && aptitude && (
        <AptitudeParentCard test={aptitude} childName={childName} />
      )}
    </div>
  );
}
