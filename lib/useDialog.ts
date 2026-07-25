"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared modal behaviour, so every dialog in the portal treats a keyboard user
// the same way:
//   • Esc closes it
//   • Tab stays inside the dialog instead of wandering onto the page behind
//   • focus returns to whatever opened it when it closes
//   • the page behind can't scroll while it's open (opt-out with lockScroll)
//
// Pass the element that wraps the dialog's own controls (not the backdrop).
export function useDialog(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement>,
  { lockScroll = true, autoFocus = true }: { lockScroll?: boolean; autoFocus?: boolean } = {},
) {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    opener.current = document.activeElement as HTMLElement | null;

    if (autoFocus) {
      // Prefer the first control; fall back to the dialog itself so screen
      // readers announce it even when it holds no focusable element.
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const first = el.querySelector<HTMLElement>(FOCUSABLE);
        (first ?? el).focus?.();
      });
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;

      const el = ref.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((n) => !n.hasAttribute("hidden") && !n.closest('[aria-hidden="true"]'));
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (lockScroll) document.body.style.overflow = prevOverflow;
      // Put the user back where they were — losing focus to <body> strands a
      // keyboard user at the top of the page.
      opener.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
