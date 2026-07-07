// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";

import Tour, { type TourStep } from "@/components/tour/Tour";

const steps: TourStep[] = [
  { target: "one", title: "First stop", body: "Body one" },
  { target: "two", title: "Second stop", body: "Body two" },
];

// A host that renders the tour targets plus the Tour itself.
function Host({ tourId = "test" }: { tourId?: string }) {
  return (
    <div>
      <div data-tour="one">one</div>
      <div data-tour="two">two</div>
      <Tour tourId={tourId} steps={steps} />
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("Tour", () => {
  it("auto-starts on first visit and shows the first step", () => {
    render(<Host tourId="auto" />);
    // nothing yet — it waits ~650ms after paint
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => { vi.advanceTimersByTime(700); });
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByText("First stop")).toBeTruthy();
    expect(screen.getByText(/Step 1 of 2/)).toBeTruthy();
  });

  it("does not start again once completed (localStorage flag)", () => {
    localStorage.setItem("dmaths-tour-done-done", "1");
    render(<Host tourId="done" />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("marks done when the tour is finished", () => {
    render(<Host tourId="finish" />);
    act(() => { vi.advanceTimersByTime(700); });
    // step 1 → Next → step 2 → Done
    fireEvent.click(screen.getByText("Next →"));
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.click(screen.getByText("Done"));
    expect(localStorage.getItem("dmaths-tour-finish-done")).toBe("1");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
