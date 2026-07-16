"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";

// In-portal live classroom powered by Jitsi's IFrame API — video, audio and
// screen sharing happen right here, no Zoom or Google Meet. The media runs on
// Jitsi's servers (meet.jit.si by default; point JITSI_DOMAIN at your own
// self-hosted instance or an 8x8 JaaS tenant for production branding/limits).
//
// When a host (tutor/admin) is in the room it:
//  • flags the class "live" (+ heartbeat) so learners see a "LIVE now" badge,
//  • optionally auto-records and files the recording into the class's recordings
//    (only where a recording backend exists — self-hosted Jibri or JaaS).
declare global { interface Window { JitsiMeetExternalAPI?: any } }

export default function LiveRoom({ domain, roomName, displayName, email, jwt, isModerator, autoRecord = false, classId, subject, backHref }: {
  domain: string; roomName: string; displayName: string; email?: string; jwt?: string | null;
  isModerator: boolean; autoRecord?: boolean; classId: string; subject: string; backHref: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    // Tell the server this class is (not) live. keepalive lets the final "off"
    // ping survive the page unloading.
    const setLive = (live: boolean) => {
      if (!isModerator) return;
      try {
        fetch("/api/classes/live", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, live }), keepalive: true,
        }).catch(() => {});
      } catch { /* best effort */ }
    };

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
        jwt: jwt || undefined,
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

      api.addListener("videoConferenceJoined", () => {
        if (cancelled) return;
        setLoading(false);
        // A learner joining the live room self-marks attendance (present, or late
        // if >10 min after start) — the same as clicking an external join link.
        if (!isModerator) {
          fetch("/api/attendance/join", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ classId }),
          }).catch(() => {});
        }
        if (isModerator) {
          setLive(true);
          heartbeat = setInterval(() => setLive(true), 60_000);
          // Kick off recording where a backend is configured (self-hosted Jibri /
          // JaaS). No-op / harmless on the plain public server.
          if (autoRecord) {
            try { api.executeCommand("startRecording", { mode: "file" }); } catch { /* no backend */ }
          }
        }
      });

      // When a recording link is produced, file it as the class recording (which
      // notifies the roster). Fires on JaaS / suitably configured self-host.
      const onRecordingLink = (e: any) => {
        const link = e?.link || e?.recordingLink;
        if (!link) return;
        fetch("/api/classes/recording", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, url: link }),
        }).catch(() => {});
      };
      api.addListener("recordingLinkAvailable", onRecordingLink);

      api.addListener("readyToClose", () => { setLive(false); router.push(backHref); });
    }).catch((e) => { if (!cancelled) setError(e.message || "Could not start the class."); });

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      setLive(false);
      try { apiRef.current?.dispose(); } catch { /* already gone */ }
      apiRef.current = null;
    };
  }, [domain, roomName, displayName, email, jwt, isModerator, autoRecord, classId, backHref, router]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-board">
      {/* Slim header with a safe way out */}
      <div className="flex items-center justify-between gap-3 bg-board px-4 py-2 text-white">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold"><Icon name="radio" className="h-4 w-4 text-red-400" /> Live · {subject}</p>
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
