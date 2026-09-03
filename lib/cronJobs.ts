// The scheduled jobs this portal depends on, in one place.
//
// Admin → System health reads this to decide whether each job is running often
// enough, and it doubles as the definitive list of what to set up on
// cron-job.org (GO-LIVE.md Step 4 mirrors it).
//
// `everyMinutes` is how often the job SHOULD run. A job is flagged once nothing
// has been heard from it for more than `graceFactor` × that — long enough that
// one missed tick isn't an alarm, short enough that a broken job surfaces the
// same day.
//
// `via` matters: most jobs are external (cron-job.org, authenticated with
// `?key=<CRON_SECRET>`), but the keep-alive is declared in vercel.json and
// authenticates by header only. Telling someone to wire that one on
// cron-job.org gives them a permanent 401 on a job that was already working.

export type CronTrigger = "cron-job.org" | "vercel";

export type CronJob = {
  key: string;          // matches the `job` column in cron_runs
  label: string;
  path: string;         // the endpoint that gets called
  everyMinutes: number;
  what: string;         // plain English, shown in the admin table
  optional?: boolean;   // not scheduling it is a choice, not a fault
  via?: CronTrigger;    // defaults to "cron-job.org"
};

export const triggerOf = (job: CronJob): CronTrigger => job.via ?? "cron-job.org";

export const GRACE_FACTOR = 2.5;

export const CRON_JOBS: CronJob[] = [
  {
    key: "classes", label: "Class reminders", path: "/api/reminders/classes",
    everyMinutes: 15,
    what: "Tells learners and their tutor that a class starts soon.",
  },
  {
    key: "broadcasts", label: "Scheduled broadcasts", path: "/api/cron/broadcasts",
    everyMinutes: 15,
    what: "Sends the broadcasts you scheduled for a later time.",
  },
  {
    key: "nudges", label: "Engagement nudges", path: "/api/reminders/nudges",
    everyMinutes: 1440,
    what: "Nudges a learner whose streak is about to break, or who has gone quiet.",
  },
  {
    key: "monthly-billing", label: "Monthly attendance billing", path: "/api/cron/monthly-billing",
    everyMinutes: 1440, via: "vercel",
    what: "3 days before month-end, bills each learner for the hours they attended and notifies their parent.",
  },
  {
    key: "subscriptions", label: "Subscription reminders", path: "/api/reminders/subscriptions",
    everyMinutes: 1440,
    what: "Reminds parents that a subscription is about to expire.",
  },
  {
    key: "assignments", label: "Assignment reminders", path: "/api/reminders/assignments",
    everyMinutes: 1440,
    what: "Emails learners who haven't submitted something due tomorrow.",
  },
  {
    key: "guardian-digest", label: "Guardian digest", path: "/api/reminders/guardian-digest",
    everyMinutes: 10080, optional: true,
    what: "Emails each guardian a short progress summary for their child.",
  },
  {
    key: "weekly-digest", label: "Weekly digest", path: "/api/reminders/weekly-digest",
    everyMinutes: 10080, optional: true,
    what: "The learner's own week in review.",
  },
  {
    key: "keepalive", label: "Database keep-alive", path: "/api/cron/keepalive",
    everyMinutes: 1440, optional: true, via: "vercel",
    what: "Touches Supabase so a free-tier project isn't paused for inactivity.",
  },
];

export type JobState = "ok" | "late" | "never";

// Green while we've heard from it recently, red once it's overdue, grey if it
// has never reported at all (not scheduled yet, or the URL is wrong).
export function jobState(job: CronJob, lastRunAt: string | null | undefined, now = new Date()): JobState {
  if (!lastRunAt) return "never";
  const ageMinutes = (now.getTime() - new Date(lastRunAt).getTime()) / 60_000;
  return ageMinutes > job.everyMinutes * GRACE_FACTOR ? "late" : "ok";
}

// "every 15 minutes" / "daily" / "weekly" — how the cadence reads in the table.
export function cadenceLabel(everyMinutes: number): string {
  if (everyMinutes < 60) return `every ${everyMinutes} minutes`;
  if (everyMinutes < 1440) return `every ${Math.round(everyMinutes / 60)} hours`;
  if (everyMinutes === 1440) return "daily";
  if (everyMinutes === 10080) return "weekly";
  return `every ${Math.round(everyMinutes / 1440)} days`;
}
