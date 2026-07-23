import { describe, it, expect } from "vitest";
import { googleCalUrl, icsText, icsDataUri } from "@/lib/calendar";

const CLASS = {
  subject: "Calculus",
  starts_at: "2026-03-10T14:00:00Z",
  duration_minutes: 90,
  platform: "Zoom",
  link: "https://zoom.example/abc",
};

describe("calendar helpers", () => {
  it("google URL carries UTC start/end matching the duration", () => {
    const url = googleCalUrl(CLASS);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("dates=20260310T140000Z%2F20260310T153000Z"); // +90 min
    expect(url).toContain("Calculus");
  });

  it("defaults to a 60-minute event when no duration given", () => {
    const url = googleCalUrl({ subject: "Maths", starts_at: "2026-03-10T14:00:00Z" });
    expect(url).toContain("dates=20260310T140000Z%2F20260310T150000Z");
  });

  it("ics contains a valid VEVENT with matching times + summary", () => {
    const ics = icsText(CLASS);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260310T140000Z");
    expect(ics).toContain("DTEND:20260310T153000Z");
    expect(ics).toContain("SUMMARY:Calculus — D-Maths");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("ics data URI is a downloadable calendar mime", () => {
    expect(icsDataUri(CLASS).startsWith("data:text/calendar;charset=utf-8,")).toBe(true);
  });
});
