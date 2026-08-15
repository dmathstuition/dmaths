import { describe, it, expect } from "vitest";
import { canStart, isScheduledAhead, reqStatusMeta } from "@/lib/mockRequests";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const at = (mins: number) => new Date(NOW.getTime() + mins * 60_000).toISOString();

describe("canStart", () => {
  it("only an approved request can start", () => {
    expect(canStart({ status: "pending" }, NOW)).toBe(false);
    expect(canStart({ status: "declined" }, NOW)).toBe(false);
    expect(canStart({ status: "used" }, NOW)).toBe(false);
    expect(canStart({ status: "approved" }, NOW)).toBe(true);
  });
  it("respects a future scheduled start time", () => {
    expect(canStart({ status: "approved", scheduled_for: at(30) }, NOW)).toBe(false); // not yet
    expect(canStart({ status: "approved", scheduled_for: at(-1) }, NOW)).toBe(true);  // time passed
  });
});

describe("isScheduledAhead", () => {
  it("is true only for an approved, not-yet-due request", () => {
    expect(isScheduledAhead({ status: "approved", scheduled_for: at(30) }, NOW)).toBe(true);
    expect(isScheduledAhead({ status: "approved", scheduled_for: at(-1) }, NOW)).toBe(false);
    expect(isScheduledAhead({ status: "pending", scheduled_for: at(30) }, NOW)).toBe(false);
    expect(isScheduledAhead({ status: "approved" }, NOW)).toBe(false);
  });
});

describe("reqStatusMeta", () => {
  it("labels each status and falls back to pending", () => {
    expect(reqStatusMeta("approved").label).toBe("Approved");
    expect(reqStatusMeta("used").label).toBe("Completed");
    expect(reqStatusMeta("bogus").label).toBe("Awaiting approval");
  });
});
