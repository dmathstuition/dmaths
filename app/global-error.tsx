"use client";
// Root-level error boundary. Catches failures that escape the root layout
// (where app/error.tsx can't reach). Reports to Sentry (no-op without a DSN)
// and renders a self-contained branded fallback — global-error replaces the
// root layout, so it must ship its own <html>/<body> and can't rely on the
// app's stylesheet; hence inline styles in the brand palette.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#0A1F3D",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <p style={{ fontSize: "3rem", fontWeight: 800, color: "#EFAE56", margin: 0 }}>Oops</p>
        <h1 style={{ marginTop: "8px", fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ marginTop: "8px", maxWidth: "24rem", fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
          An unexpected error occurred. Please try again — if it keeps happening, contact us at
          {" "}dmathstuition@gmail.com.
        </p>
        <a
          href="/"
          style={{
            marginTop: "28px",
            display: "inline-block",
            borderRadius: "9999px",
            padding: "12px 24px",
            background: "#EFAE56",
            color: "#0A1F3D",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </body>
    </html>
  );
}
