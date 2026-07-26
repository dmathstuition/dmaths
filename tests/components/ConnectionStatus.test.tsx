// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import ConnectionStatus from "@/components/ConnectionStatus";

afterEach(cleanup);

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

describe("ConnectionStatus", () => {
  it("shows nothing while connected", () => {
    setOnline(true);
    const { container } = render(<ConnectionStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts offline when the browser is already offline", () => {
    setOnline(false);
    render(<ConnectionStatus />);
    expect(screen.getByRole("status")).toHaveTextContent(/offline/i);
  });

  it("appears on an offline event and flips to 'back online' on reconnect", () => {
    setOnline(true);
    render(<ConnectionStatus />);
    expect(screen.queryByRole("status")).toBeNull();

    act(() => { setOnline(false); window.dispatchEvent(new Event("offline")); });
    expect(screen.getByRole("status")).toHaveTextContent(/offline/i);

    act(() => { setOnline(true); window.dispatchEvent(new Event("online")); });
    expect(screen.getByRole("status")).toHaveTextContent(/back online/i);
  });

  it("hides again a few seconds after reconnecting", () => {
    vi.useFakeTimers();
    setOnline(false);
    render(<ConnectionStatus />);
    act(() => { setOnline(true); window.dispatchEvent(new Event("online")); });
    expect(screen.getByRole("status")).toHaveTextContent(/back online/i);

    act(() => { vi.advanceTimersByTime(3100); });
    expect(screen.queryByRole("status")).toBeNull();
    vi.useRealTimers();
  });
});
