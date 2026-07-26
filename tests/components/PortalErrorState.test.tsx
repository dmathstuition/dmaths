// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import PortalErrorState from "@/components/PortalErrorState";

vi.mock("next/link", () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

const setOnline = (value: boolean) =>
  Object.defineProperty(navigator, "onLine", { configurable: true, value });

describe("PortalErrorState", () => {
  it("shows the error variant when online", () => {
    setOnline(true);
    render(<PortalErrorState reset={() => {}} />);
    expect(screen.getByRole("heading")).toHaveTextContent(/something went wrong/i);
    // Support contact is offered for real errors, not for a mere disconnection.
    expect(screen.getByText(/contact support/i)).toBeTruthy();
  });

  it("shows the offline variant when disconnected, and hides support contact", () => {
    setOnline(false);
    render(<PortalErrorState reset={() => {}} />);
    expect(screen.getByRole("heading")).toHaveTextContent(/offline/i);
    expect(screen.queryByText(/contact support/i)).toBeNull();
  });

  it("calls reset when 'Try again' is pressed", () => {
    setOnline(true);
    const reset = vi.fn();
    render(<PortalErrorState reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  // A network blip shouldn't need a tap — reconnecting retries on its own.
  it("auto-retries when the connection returns", () => {
    setOnline(false);
    const reset = vi.fn();
    render(<PortalErrorState reset={reset} />);
    act(() => { setOnline(true); window.dispatchEvent(new Event("online")); });
    expect(reset).toHaveBeenCalled();
  });

  it("points the home button at the given role", () => {
    setOnline(true);
    render(<PortalErrorState reset={() => {}} home="/admin" homeLabel="Back to admin" />);
    expect(screen.getByText("Back to admin").closest("a")).toHaveAttribute("href", "/admin");
  });
});
