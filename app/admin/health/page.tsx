import { supabaseAdmin } from "@/lib/supabase/admin";
import { CRON_JOBS } from "@/lib/cronJobs";
import HealthClient from "@/components/admin/HealthClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "System health · D-Maths" };

// Feature tables and the migration that creates each. Probing them is the
// honest way to answer "have I run everything?" — far more reliable than
// remembering which SQL files you pasted.
const FEATURE_TABLES: { table: string; migration: string; unlocks: string }[] = [
  { table: "cron_runs", migration: "migration-cron-runs.sql", unlocks: "This page's job heartbeat" },
  { table: "email_log", migration: "migration-email-log.sql", unlocks: "Duplicate-email guard (reminder crons need it)" },
  { table: "certificates", migration: "migration-certificates.sql", unlocks: "Certificates" },
  { table: "scheduled_broadcasts", migration: "migration-scheduled-broadcasts.sql", unlocks: "Scheduled broadcasts" },
  { table: "report_cards", migration: "migration-report-cards.sql", unlocks: "Report cards" },
  { table: "lesson_notes", migration: "migration-lesson-notes.sql", unlocks: "Lesson log" },
  { table: "daily_tasks", migration: "migration-daily-tasks.sql", unlocks: "Task of the day" },
  { table: "study_sessions", migration: "migration-study-sessions.sql", unlocks: "Focus mode" },
  { table: "flashcard_decks", migration: "migration-flashcards.sql", unlocks: "Revision cards" },
  { table: "parent_student_links", migration: "migration-parents.sql", unlocks: "Parent portal" },
];

// Which optional integrations are configured. We report a BOOLEAN and nothing
// else — a value must never reach the browser.
function configured() {
  return [
    { key: "CRON_SECRET", set: !!process.env.CRON_SECRET, what: "Authenticates the scheduled jobs", critical: true },
    { key: "EMAIL_RELAY_URL", set: !!process.env.EMAIL_RELAY_URL, what: "Sends every email", critical: true },
    { key: "PAYSTACK_SECRET_KEY", set: !!process.env.PAYSTACK_SECRET_KEY, what: "Verifies payments and the webhook", critical: true },
    { key: "NEXT_PUBLIC_SITE_URL", set: !!process.env.NEXT_PUBLIC_SITE_URL, what: "The address used in email links", critical: true },
    { key: "NEXT_PUBLIC_SENTRY_DSN", set: !!process.env.NEXT_PUBLIC_SENTRY_DSN, what: "Error monitoring", critical: false },
    { key: "DEEPSEEK_API_KEY", set: !!process.env.DEEPSEEK_API_KEY, what: "The D-Maths A.I helper", critical: false },
    { key: "VAPID_PRIVATE_KEY", set: !!process.env.VAPID_PRIVATE_KEY, what: "Push notifications", critical: false },
  ];
}

export default async function HealthPage() {
  const admin = supabaseAdmin();

  // Heartbeats. If the table itself is missing, every job simply reads as
  // "never" — which is the right answer until the migration is run.
  const { data: runs } = await admin.from("cron_runs").select("job, last_run_at, last_status, last_detail, runs");
  const runByJob = Object.fromEntries((runs ?? []).map((r: any) => [r.job, r]));

  const jobs = CRON_JOBS.map((j) => ({ job: j, run: runByJob[j.key] ?? null }));

  // One cheap probe per feature table.
  const migrations = await Promise.all(
    FEATURE_TABLES.map(async (f) => {
      const { error } = await admin.from(f.table).select("*", { count: "exact", head: true });
      return { ...f, present: !error };
    }),
  );

  const { data: emails } = await admin
    .from("email_log")
    .select("kind, recipient, sent_on, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <HealthClient
      jobs={jobs}
      migrations={migrations}
      config={configured()}
      emails={emails ?? []}
      emailLogReady={migrations.find((m) => m.table === "email_log")?.present ?? false}
    />
  );
}
