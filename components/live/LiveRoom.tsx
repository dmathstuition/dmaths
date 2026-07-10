"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// In-portal live classroom powered by Jitsi's IFrame API — video, audio and
// screen sharing happen right here, no Zoom or Google Meet. The media runs on
// Jitsi's servers (meet.jit.si by default; point JITSI_DOMAIN at your own
// self-hosted instance or an 8x8 JaaS tenant for production branding/limits).
declare global { interface Window { JitsiMeetExternalAPI?: any } }

export default function LiveRoom({ domain, roomName, displayName, email, isModerator, subject, backHref }: {
  domain: string; roomName: string; displayName: string; email?: string;
  isModerator: boolean; subject: string; backHref: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function loadScript(): Promise<void> {
      if (window.JitsiMeetExternalAPI) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `https://${domain}/external_api.js`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Could not load the video engine."));
        document.body.appendChild(s);
      });
    }

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      const api = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName, email: email || undefined },
        configOverwrite: {
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          startWithAudioMuted: !isModerator,
          startWithVideoMuted: !isModerator,
          disableThirdPartyRequests: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
          DISABLE_DEEP_LINKING: true,
        },
      });
      apiRef.current = api;
      api.addListener("videoConferenceJoined", () => { if (!cancelled) setLoading(false); });
      api.addListener("readyToClose", () => router.push(backHref));
    }).catch((e) => { if (!cancelled) setError(e.message || "Could not start the class."); });

    return () => {
      cancelled = true;
      try { apiRef.current?.dispose(); } catch { /* already gone */ }
      apiRef.current = null;
    };
  }, [domain, roomName, displayName, email, isModerator, backHref, router]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-board">
      {/* Slim header with a safe way out */}
      <div className="flex items-center justify-between gap-3 bg-board px-4 py-2 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">🔴 Live · {subject}</p>
          <p className="text-[11px] text-white/50">{isModerator ? "You're the host" : "D-Maths live class"}</p>
        </div>
        <button onClick={() => { try { apiRef.current?.executeCommand("hangup"); } catch {} router.push(backHref); }}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-600">
          Leave class
        </button>
      </div>

      <div className="relative flex-1">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <p className="font-bold">{error}</p>
            <button onClick={() => router.push(backHref)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Go back</button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">
                Connecting to the classroom…
              </div>
            )}
            <div ref={containerRef} className="h-full w-full" />
          </>
        )}
      </div>
    </div>
  );
}
