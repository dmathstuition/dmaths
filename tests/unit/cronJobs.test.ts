import { describe, it, expect } from "vitest";
import { CRON_JOBS, GRACE_FACTOR, jobState, cadenceLabel, triggerOf } from "@/lib/cronJobs";

const NOW = new Date("2026-03-10T12:00:00Z");
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

const job = (everyMinutes: number) =>
  ({ key: "x", label: "X", path: "/x", everyMinutes, what: "" } as const);

describe("jobState", () => {
  it("is green while the job is reporting on schedule", () => {
    expect(jobState(job(15), minutesAgo(3), NOW)).toBe("ok");
    expect(jobState(job(1440), minutesAgo(60 * 20), NOW)).toBe("ok");
  });

  // One missed tick shouldn't cry wolf; a genuinely dead job must.
  it("tolerates a single missed tick", () => {
    expect(jobState(job(15), minutesAgo(15 * GRACE_FACTOR - 1), NOW)).toBe("ok");
  });

  it("goes red once well past its schedule", () => {
    expect(jobState(job(15), minutesAgo(15 * GRACE_FACTOR + 1), NOW)).toBe("late");
    expect(jobState(job(1440), minutesAgo(60 * 24 * 4), NOW)).toBe("late");
  });

  // This is the state the broken assignment-reminder cron would have shown.
  it("reports never when nothing has ever been heard", () => {
    expect(jobState(job(15), null, NOW)).toBe("never");
    expect(jobState(job(15), undefined, NOW)).toBe("never");
  });
});

describe("cadenceLabel", () => {
  it("reads the way a person would say it", () => {
    expect(cadenceLabel(15)).toBe("every 15 minutes");
    expect(cadenceLabel(180)).toBe("every 3 hours");
    expect(cadenceLabel(1440)).toBe("daily");
    expect(cadenceLabel(10080)).toBe("weekly");
  });
});

describe("CRON_JOBS", () => {
  it("has a unique key per job and a real endpoint path", () => {
    const keys = CRON_JOBS.map((j) => j.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const j of CRON_JOBS) {
      expect(j.path).toMatch(/^\/api\//);
      expect(j.everyMinutes).toBeGreaterThan(0);
    }
  });

  // The keep-alive is declared in vercel.json and authenticates by header, so
  // it must never be presented as something to wire up on cron-job.org — doing
  // that returns 401 forever on a job that was already working.
  it("marks the keep-alive as Vercel-triggered, and nothing else", () => {
    const vercel = CRON_JOBS.filter((j) => triggerOf(j) === "vercel").map((j) => j.key);
    expect(vercel).toEqual(["keepalive"]);
  });

  it("defaults every other job to cron-job.org", () => {
    const external = CRON_JOBS.filter((j) => j.key !== "keepalive");
    expect(external).not.toHaveLength(0);
    for (const j of external) expect(triggerOf(j)).toBe("cron-job.org");
  });
});
