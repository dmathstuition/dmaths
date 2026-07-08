import type { MetadataRoute } from "next";

// Web App Manifest — makes the portal installable ("Add to Home Screen").
// All URLs are root-relative, so this works on any domain (vercel.app today,
// a custom domain later) with no change.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "D-Maths Tuition Centre",
    short_name: "D-Maths",
    description:
      "World-class online mathematics tuition for JSS & SSS students across Nigeria — live classes, progress tracking and a portal built for results.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A2A4F",
    theme_color: "#1A60AB",
    categories: ["education"],
    lang: "en-NG",
    dir: "ltr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the app icon → quick actions (also carried into the Play TWA).
    shortcuts: [
      { name: "Sign in", url: "/login", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My portal", url: "/portal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Register", url: "/apply", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
