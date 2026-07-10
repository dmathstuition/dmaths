"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Softly re-fetches the current server component tree on an interval (client
// state preserved, no full reload). Used on the classes page so a tutor going
// live shows up as a "LIVE now" badge within ~30s without a manual refresh.
export default function PollRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
