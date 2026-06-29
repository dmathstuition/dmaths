"use client";
import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Google Analytics 4 — loads ONLY when:
//   1) a Measurement ID is configured (NEXT_PUBLIC_GA_ID), and
//   2) the visitor has acknowledged the cookie notice (consent).
// This keeps GA's cookies off until consent, matching the cookie banner.
// CookieBanner dispatches a `dm-consent` event on "I understand", so GA can
// start within the same session without a reload.
export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    try {
      if (localStorage.getItem("dm_privacy_ack")) setConsented(true);
    } catch {
      /* storage blocked — stay off */
    }
    const onConsent = () => setConsented(true);
    window.addEventListener("dm-consent", onConsent);
    return () => window.removeEventListener("dm-consent", onConsent);
  }, []);

  if (!GA_ID || !consented) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
