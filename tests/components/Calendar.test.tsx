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

// The month label is the level-2 heading (the detail/agenda panels use <h3>).
const monthLabel = () => screen.getByRole("heading", { level: 2 }).textContent;
const gridButtons = () =>
  Array.from(document.querySelectorAll(".grid.grid-cols-7.gap-px button")) as HTMLButtonElement[];

describe("Calendar grid", () => {
  it("renders exactly 42 cells for any month", () => {
    renderCalendar();
    expect(gridButtons()).toHaveLength(42);
  });

  it("January 2025: first day is Wednesday (3 null prefix cells), 31 day cells", () => {
    renderCalendar();
    expect(monthLabel()).toBe("January 2025");
    const buttons = gridButtons();
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[2].disabled).toBe(true);
    expect(buttons[3].disabled).toBe(false);
    expect(buttons[3].textContent).toContain("1");
  });

  it("February 2024 (leap year) renders 29 enabled day buttons", () => {
    vi.setSystemTime(new Date(2024, 1, 1));
    renderCalendar();
    expect(gridButtons().filter(b => !b.disabled)).toHaveLength(29);
    expect(monthLabel()).toBe("February 2024");
  });

  it("February 2025 (non-leap year) renders 28 enabled day buttons", () => {
    renderCalendar();
    fireEvent.click(screen.getByText("▸"));
    expect(gridButtons().filter(b => !b.disabled)).toHaveLength(28);
    expect(monthLabel()).toBe("February 2025");
  });
});

describe("Calendar navigation", () => {
  it("navigating next from December 2025 shows January 2026", () => {
    vi.setSystemTime(new Date(2025, 11, 1));
    renderCalendar();
    expect(monthLabel()).toBe("December 2025");
    fireEvent.click(screen.getByText("▸"));
    expect(monthLabel()).toBe("January 2026");
  });

  it("navigating prev from January 2025 shows December 2024", () => {
    renderCalendar();
    expect(monthLabel()).toBe("January 2025");
    fireEvent.click(screen.getByText("◂"));
    expect(monthLabel()).toBe("December 2024");
  });

  it("clears the selected day when navigating to a different month", () => {
    // A past event (Jan 10) so it won't appear in the month-independent agenda.
    renderCalendar([event({ date: new Date(2025, 0, 10), title: "Math Class" })]);
    const day10 = gridButtons().find(b => b.textContent?.trim().startsWith("10"));
    fireEvent.click(day10!);
    expect(screen.getAllByText("Math Class").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("▸"));
    expect(screen.queryByText("Math Class")).not.toBeInTheDocument();
  });
});

describe("Calendar events", () => {
  it("shows an event on the correct day when in the right month", () => {
    renderCalendar([event({ date: new Date(2025, 0, 15), title: "Maths Lesson" })]);
    const day15 = gridButtons().find(b => !b.disabled && b.textContent?.includes("15"));
    fireEvent.click(day15!);
    expect(screen.getAllByText("Maths Lesson").length).toBeGreaterThan(0);
  });

  it("does not show a past January event when viewing February", () => {
    renderCalendar([event({ date: new Date(2025, 0, 5), title: "January Only" })]);
    fireEvent.click(screen.getByText("▸")); // go to February
    expect(screen.queryByText("January Only")).not.toBeInTheDocument();
  });

  it("shows a '+N more' overflow on days with many events", () => {
    const manyEvents = Array.from({ length: 5 }, (_, i) =>
      event({ date: new Date(2025, 0, 20), title: `Event ${i + 1}`, type: "class" })
    );
    renderCalendar(manyEvents);
    expect(screen.getByText(/\+3 more/)).toBeInTheDocument();
  });
});

describe("Calendar today highlight", () => {
  it("applies the today highlight class to the current date cell", () => {
    renderCalendar();
    const day15 = gridButtons().find(b => !b.disabled && b.textContent?.trim().startsWith("15"));
    expect(day15?.className).toContain("bg-gold-pale");
  });

  it("does not apply today highlight to other days", () => {
    renderCalendar();
    const day10 = gridButtons().find(b => !b.disabled && b.textContent?.trim().startsWith("10"));
    expect(day10?.className).not.toContain("bg-gold-pale");
  });
});
