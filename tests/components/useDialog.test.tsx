// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useRef, useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useDialog } from "@/lib/useDialog";

// Every modal in the portal shares this behaviour, so it is worth pinning down:
// Esc closes, Tab can't escape, and focus goes back where it came from.
function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDialog(open, () => { setOpen(false); onClose?.(); }, ref);

  return (
    <div>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div ref={ref} role="dialog">
          <button>First</button>
          <button>Last</button>
        </div>
      )}
    </div>
  );
}

describe("useDialog", () => {
  it("moves focus into the dialog and back to the opener on close", async () => {
    render(<Harness />);
    const opener = screen.getByText("Open");
    opener.focus();
    fireEvent.click(opener);

    // autoFocus runs on the next frame.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    expect(document.activeElement).toBe(screen.getByText("First"));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByText("Open"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps Tab from the last control back to the first", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const first = screen.getByText("First");
    const last = screen.getByText("Last");

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // …and Shift+Tab from the first wraps to the last.
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("locks background scrolling while open and restores it after", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
