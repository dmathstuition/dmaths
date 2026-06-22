// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { makeMockSupabaseClient } from "../mocks/supabase";

// Mock supabaseBrowser before importing the component
let mockBrowserClient: ReturnType<typeof makeMockSupabaseClient>;

vi.mock("@/lib/supabase/client", () => ({
  supabaseBrowser: () => mockBrowserClient,
}));

// Mock next/link as a plain anchor so we don't need the Next.js router
vi.mock("next/link", () => ({
  default: ({ href, children, onClick, className }: any) => (
    <a href={href} onClick={onClick} className={className}>{children}</a>
  ),
}));

// Mock the Icon component
vi.mock("@/components/Icons", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

import NotificationBell from "@/components/NotificationBell";

function makeNotification(overrides: object = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Test Notice",
    body: "Notice body",
    read: false,
    created_at: new Date().toISOString(),
    user_id: "user-1",
    link: null,
    ...overrides,
  };
}

function setupUserAndNotifications(notifications: any[]) {
  mockBrowserClient.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  mockBrowserClient._qb.single.mockResolvedValue({ data: notifications, error: null });
  // The notifications query doesn't use .single() — it uses .order().limit()
  // which is direct-awaited. Configure that.
  mockBrowserClient._qb._setDirectResolve({ data: notifications });
}

beforeEach(() => {
  mockBrowserClient = makeMockSupabaseClient();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("NotificationBell badge", () => {
  it("shows the correct unread count when some notifications are unread", async () => {
    const notifications = [
      makeNotification({ read: false }),
      makeNotification({ read: false }),
      makeNotification({ read: true }),
    ];
    setupUserAndNotifications(notifications);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show a badge when all notifications are read", async () => {
    setupUserAndNotifications([makeNotification({ read: true })]);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    // No badge rendered when unread === 0
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("caps the badge at '9+' when there are more than 9 unread", async () => {
    const notifications = Array.from({ length: 10 }, () => makeNotification({ read: false }));
    setupUserAndNotifications(notifications);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});

describe("NotificationBell polling", () => {
  it("polls again after 45 seconds", async () => {
    setupUserAndNotifications([makeNotification()]);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    const callsBefore = mockBrowserClient.auth.getUser.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(45_001);
      await Promise.resolve();
    });

    expect(mockBrowserClient.auth.getUser.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("stops polling after the component unmounts", async () => {
    setupUserAndNotifications([makeNotification()]);

    const { unmount } = render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    unmount();

    const callsAtUnmount = mockBrowserClient.auth.getUser.mock.calls.length;
    await act(async () => {
      vi.advanceTimersByTime(90_000);
      await Promise.resolve();
    });

    expect(mockBrowserClient.auth.getUser.mock.calls.length).toBe(callsAtUnmount);
  });
});

describe("NotificationBell dropdown", () => {
  it("calls markAllRead when opening with unread notifications", async () => {
    const unread = [makeNotification({ id: "n1", read: false }), makeNotification({ id: "n2", read: false })];
    setupUserAndNotifications(unread);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await act(async () => { await Promise.resolve(); });

    expect(mockBrowserClient._qb.update).toHaveBeenCalledWith({ read: true });
    expect(mockBrowserClient._qb.in).toHaveBeenCalledWith("id", expect.arrayContaining(["n1", "n2"]));
  });

  it("does not call update when opening with zero unread", async () => {
    setupUserAndNotifications([makeNotification({ read: true })]);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    await act(async () => { await Promise.resolve(); });

    expect(mockBrowserClient._qb.update).not.toHaveBeenCalled();
  });

  it("shows notification titles and bodies in the dropdown", async () => {
    setupUserAndNotifications([
      makeNotification({ title: "School Closed", body: "No classes today", read: false }),
    ]);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText("School Closed")).toBeInTheDocument();
    expect(screen.getByText("No classes today")).toBeInTheDocument();
  });

  it("shows 'Nothing yet.' when there are no notifications", async () => {
    setupUserAndNotifications([]);

    render(<NotificationBell noticesHref="/portal/notices" />);
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));

    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
  });
});
