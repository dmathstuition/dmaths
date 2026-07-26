"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";
import { cadenceLabel, jobState, triggerOf, type CronJob, type JobState } from "@/lib/cronJobs";
import { fmtWAT } from "@/lib/time";

type Run = { job: string; last_run_at: string; last_status: string; last_detail: any; runs: number } | null;
type Row = { job: CronJob; run: Run };
type Migration = { table: string; migration: string; unlocks: string; present: boolean };
type Config = { key: string; set: boolean; what: string; critical: boolean };
type EmailRow = { kind: string; recipient: string; sent_on: string; created_at: string };

// "4 minutes ago" / "3 days ago" — precise enough to judge a schedule at a glance.
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const STATE_PILL: Record<JobState, { cls: string; label: string }> = {
  ok:    { cls: "pill-green", label: "Running" },
  late:  { cls: "pill-red",   label: "Overdue" },
  never: { cls: "pill-amber", label: "Never run" },
};

// "Never run" means different things depending on the job. A Vercel Cron is
// already scheduled and simply hasn't fired yet (it only runs on Production);
// an optional cron-job.org job just hasn't been created. Saying "Not scheduled"
// for the Vercel one would send someone off to create a job that must not exist.
function neverLabel(job: CronJob, state: JobState): string | null {
  if (state !== "never") return null;
  if (triggerOf(job) === "vercel") return "Awaiting first run";
  return job.optional ? "Not scheduled" : null;
}

// Admin → System health. Answers one question: is everything that runs on a
// schedule actually running? An assignment-reminder job once sat broken for
// weeks because nothing here existed to say so.
export default function HealthClient({
  jobs, migrations, config, emails, emailLogReady,
}: {
  jobs: Row[]; migrations: Migration[]; config: Config[]; emails: EmailRow[]; emailLogReady: boolean;
}) {
  const [showEmails, setShowEmails] = useState(false);

  const states = jobs.map((r) => jobState(r.job, r.run?.last_run_at));
  const problems = jobs.filter((r, i) => states[i] === "late" || (states[i] === "never" && !r.job.optional)).length;
  const missing = migrations.filter((m) => !m.present);
  const unset = config.filter((c) => !c.set && c.critical);

  const allWell = problems === 0 && missing.length === 0 && unset.length === 0;

  return (
    <div className="space-y-6">
      <div className="boardgrid relative flex items-center gap-4 overflow-hidden rounded-2xl bg-board p-7 text-white">
        <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${
          allWell ? "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25" : "bg-gold/15 text-gold ring-gold/25"}`}>
          <Icon name={allWell ? "checkCircle" : "alertTriangle"} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">System health</h1>
          <p className="mt-1 text-sm text-white/50">
            {allWell
              ? "Every scheduled job is reporting in, and setup is complete."
              : `${[
                  problems && `${problems} job${problems === 1 ? "" : "s"} not reporting`,
                  missing.length && `${missing.length} migration${missing.length === 1 ? "" : "s"} outstanding`,
                  unset.length && `${unset.length} setting${unset.length === 1 ? "" : "s"} missing`,
                ].filter(Boolean).join(" · ")}.`}
          </p>
        </div>
      </div>

      {/* ── Scheduled jobs ─────────────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="font-display text-lg font-semibold">Scheduled jobs</h2>
        <p className="mt-1 text-sm text-ink/55">
          Each job stamps the moment it finishes. A job goes red when nothing has been heard
          from it for well past its schedule — usually the cron was never created, was
          auto-disabled, or points at the wrong address.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-ink/45">
                <th className="pb-2 pr-3">Job</th>
                <th className="pb-2 pr-3">Should run</th>
                <th className="pb-2 pr-3">Last run</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(({ job, run }, i) => {
                const state = states[i];
                const pill = STATE_PILL[state];
                return (
                  <tr key={job.key} className="border-b border-line/60 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-bold text-ink">{job.label}</p>
                      <p className="text-[12px] text-ink/50">{job.what}</p>
                      <code className="mt-1 block text-[11px] text-ink/45">{job.path}</code>
                    </td>
                    <td className="py-3 pr-3 text-ink/60">
                      {cadenceLabel(job.everyMinutes)}
                      {triggerOf(job) === "vercel"
                        ? <span className="block text-[11px] font-semibold text-ink/45">Vercel Cron — nothing to set up</span>
                        : job.optional && <span className="block text-[11px] text-ink/45">optional</span>}
                    </td>
                    <td className="py-3 pr-3 text-ink/60">
                      {run?.last_run_at ? (
                        <>
                          <span className="font-semibold text-ink/75">{ago(run.last_run_at)}</span>
                          <span className="block text-[11px] text-ink/45">{fmtWAT(run.last_run_at)}</span>
                          {run.runs > 1 && <span className="block text-[11px] text-ink/45">{run.runs} runs total</span>}
                        </>
                      ) : (
                        <span className="text-ink/45">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={pill.cls}>{neverLabel(job, state) ?? pill.label}</span>
                      {run?.last_detail && Object.keys(run.last_detail).length > 0 && (
                        <p className="mt-1 max-w-[220px] break-words text-[11px] text-ink/45">
                          {Object.entries(run.last_detail)
                            .filter(([, v]) => typeof v !== "object")
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 rounded-xl bg-chalk px-4 py-3 text-[13px] text-ink/60">
          Every job above <em>except</em> the ones marked <strong>Vercel Cron</strong> is set up on
          cron-job.org, each URL ending <code>?key=&lt;CRON_SECRET&gt;</code>. The Vercel ones are
          declared in <code>vercel.json</code>, authenticate by header rather than by key, and run
          on their own once a build is promoted to Production — adding them to cron-job.org would
          only ever return 401. The full walkthrough is Step 4 of <strong>GO-LIVE.md</strong>.
        </p>
      </section>

      {/* ── Setup ──────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Database migrations</h2>
          <p className="mt-1 text-sm text-ink/55">
            {missing.length === 0
              ? "Every feature table is present."
              : `${missing.length} still to run in Supabase → SQL Editor.`}
          </p>
          <ul className="mt-4 space-y-2">
            {migrations.map((m) => (
              <li key={m.table} className="flex items-start gap-2.5 text-sm">
                <Icon name={m.present ? "checkCircle" : "alertTriangle"}
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${m.present ? "text-emerald-500" : "text-red-500"}`} />
                <span className="min-w-0">
                  <span className={m.present ? "text-ink/60" : "font-bold text-ink"}>{m.unlocks}</span>
                  {!m.present && <code className="mt-0.5 block break-all text-[11px] text-ink/50">supabase/{m.migration}</code>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Configuration</h2>
          <p className="mt-1 text-sm text-ink/55">
            Whether each setting exists in Vercel. Values are never shown here.
          </p>
          <ul className="mt-4 space-y-2">
            {config.map((c) => (
              <li key={c.key} className="flex items-start gap-2.5 text-sm">
                <Icon name={c.set ? "checkCircle" : c.critical ? "alertTriangle" : "helpCircle"}
                  className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                    c.set ? "text-emerald-500" : c.critical ? "text-red-500" : "text-ink/35"}`} />
                <span className="min-w-0">
                  <code className={`text-[12px] ${c.set ? "text-ink/60" : "font-bold text-ink"}`}>{c.key}</code>
                  <span className="block text-[12px] text-ink/50">
                    {c.what}{!c.set && !c.critical ? " — off" : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] text-ink/45">
            Changing an environment variable in Vercel needs a <strong>Redeploy</strong> to take effect.
          </p>
        </section>
      </div>

      {/* ── Emails actually sent ───────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Reminder emails sent</h2>
            <p className="mt-1 text-sm text-ink/55">
              {emailLogReady
                ? `The last ${emails.length} guarded sends — proof of what reached families.`
                : "Run migration-email-log.sql to start recording this."}
            </p>
          </div>
          {emails.length > 0 && (
            <button onClick={() => setShowEmails((s) => !s)} className="btn-ghost !min-h-[40px]">
              {showEmails ? "Hide" : "Show"}
            </button>
          )}
        </div>

        {showEmails && emails.length > 0 && (
          <div className="mt-4 max-h-96 overflow-y-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-ink/45">
                  <th className="pb-2 pr-3">Sent</th>
                  <th className="pb-2 pr-3">Kind</th>
                  <th className="pb-2">To</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((e, i) => (
                  <tr key={`${e.recipient}-${e.created_at}-${i}`} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-ink/60">{fmtWAT(e.created_at)}</td>
                    <td className="py-2 pr-3"><span className="pill-blue">{e.kind.replace(/_/g, " ")}</span></td>
                    <td className="py-2 break-all text-ink/60">{e.recipient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {emailLogReady && emails.length === 0 && (
          <p className="mt-4 text-sm text-ink/45">Nothing sent yet.</p>
        )}
      </section>
    </div>
  );
}
