// Next.js instrumentation hook — loads the right Sentry runtime config and
// reports server-side (route handler / server component) errors. All of this
// is a no-op unless NEXT_PUBLIC_SENTRY_DSN is set (see the sentry.*.config files).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
