// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Calendar from "@/components/Calendar";
import type { CalendarEvent } from "@/components/Calendar";

// Fix "today" at 2025-01-15 (Wednesday) so tests are deterministic
const TODAY = new Date(2025, 0, 15); // Jan 15, 2025

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TODAY);
});
afterEach(() => {
  vi.useRealTimers();
});

function renderCalendar(events: CalendarEvent[] = []) {
  return render(<Calendar events={events} />);
}

function event(overrides: Partial<CalendarEvent> & { date: Date }): CalendarEvent {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Test Event",
    type: "class",
    ...overrides,
  };
}

describe("Calendar grid", () => {
  it("renders exactly 42 cells for any month", () => {
    renderCalendar();
    // 42 buttons (including the disabled null-day ones)
    const buttons = document.querySelectorAll(".grid.grid-cols-7.gap-px button");
    expect(buttons).toHaveLength(42);
  });

  it("January 2025: first day is Wednesday (3 null prefix cells), 31 day cells", () => {
    renderCalendar();
    const header = screen.getByRole("heading");
    expect(header.textContent).toBe("January 2025");

    // First 3 buttons are disabled (null days before Jan 1)
    const buttons = document.querySelectorAll(".grid.grid-cols-7.gap-px button");
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
    expect((buttons[2] as HTMLButtonElement).disabled).toBe(true);
    // 4th button is day 1
    expect((buttons[3] as HTMLButtonElement).disabled).toBe(false);
    expect(buttons[3].textContent).toContain("1");
  });

  it("February 2024 (leap year) renders 29 enabled day buttons", () => {
    vi.setSystemTime(new Date(2024, 1, 1)); // System time is now Feb 1 2024
    renderCalendar(); // Calendar opens on February 2024 already
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const enabled = buttons.filter(b => !b.disabled);
    expect(enabled).toHaveLength(29);
    expect(screen.getByRole("heading").textContent).toBe("February 2024");
  });

  it("February 2025 (non-leap year) renders 28 enabled day buttons", () => {
    renderCalendar();
    // Click next once to go to February 2025
    fireEvent.click(screen.getByText("▸"));
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const enabled = buttons.filter(b => !b.disabled);
    expect(enabled).toHaveLength(28);
    expect(screen.getByRole("heading").textContent).toBe("February 2025");
  });
});

describe("Calendar navigation", () => {
  it("navigating next from December 2025 shows January 2026", () => {
    vi.setSystemTime(new Date(2025, 11, 1));
    renderCalendar();
    expect(screen.getByRole("heading").textContent).toBe("December 2025");
    fireEvent.click(screen.getByText("▸"));
    expect(screen.getByRole("heading").textContent).toBe("January 2026");
  });

  it("navigating prev from January 2025 shows December 2024", () => {
    renderCalendar();
    expect(screen.getByRole("heading").textContent).toBe("January 2025");
    fireEvent.click(screen.getByText("◂"));
    expect(screen.getByRole("heading").textContent).toBe("December 2024");
  });

  it("clears the selected day when navigating to a different month", () => {
    renderCalendar([event({ date: new Date(2025, 0, 10), title: "Math Class" })]);
    // Select day 10
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const day10 = buttons.find(b => b.textContent?.trim() === "10");
    fireEvent.click(day10!);
    expect(screen.getByText("Math Class")).toBeInTheDocument();

    // Navigate away
    fireEvent.click(screen.getByText("▸"));
    expect(screen.queryByText("Math Class")).not.toBeInTheDocument();
  });
});

describe("Calendar events", () => {
  it("shows an event on the correct day when in the right month", () => {
    renderCalendar([event({ date: new Date(2025, 0, 15), title: "Maths Lesson" })]);
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const day15 = buttons.find(b => !b.disabled && b.textContent?.includes("15"));
    fireEvent.click(day15!);
    expect(screen.getByText("Maths Lesson")).toBeInTheDocument();
  });

  it("does not show a January event when viewing February", () => {
    renderCalendar([event({ date: new Date(2025, 0, 15), title: "January Only" })]);
    fireEvent.click(screen.getByText("▸")); // go to February
    // No day would have the event dot, and detail panel won't show it
    expect(screen.queryByText("January Only")).not.toBeInTheDocument();
  });

  it("shows at most 3 event dots and a +N overflow for days with more events", () => {
    const manyEvents = Array.from({ length: 5 }, (_, i) =>
      event({ date: new Date(2025, 0, 20), title: `Event ${i + 1}`, type: "class" })
    );
    renderCalendar(manyEvents);
    // The +2 overflow label should appear (5 events, 3 shown as dots)
    expect(screen.getByText("+2")).toBeInTheDocument();
  });
});

describe("Calendar today highlight", () => {
  it("applies the today highlight class to the current date cell", () => {
    renderCalendar();
    // Day 15 is today (per vi.setSystemTime)
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const day15 = buttons.find(b => !b.disabled && b.textContent?.trim().startsWith("15"));
    expect(day15?.className).toContain("bg-gold-pale");
  });

  it("does not apply today highlight to other days", () => {
    renderCalendar();
    const buttons = Array.from(
      document.querySelectorAll(".grid.grid-cols-7.gap-px button")
    ) as HTMLButtonElement[];
    const day10 = buttons.find(b => !b.disabled && b.textContent?.trim() === "10");
    // day10 should NOT have bg-gold-pale (only day 15 does)
    expect(day10?.className).not.toContain("bg-gold-pale");
  });
});
