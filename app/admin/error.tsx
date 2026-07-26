"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import PortalErrorState from "@/components/PortalErrorState";

// Segment error boundary — the backstop for failures that escape the in-shell
// ErrorBoundary (e.g. thrown while the layout renders). Keeps the same designed,
// offline-aware fallback and reports to Sentry.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); console.error(error); }, [error]);
  return <PortalErrorState reset={reset} home="/admin" />;
}
