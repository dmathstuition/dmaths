import { NextResponse } from "next/server";

// Digital Asset Links for the Google Play (TWA) app. Android checks
// https://dmaths.academy/.well-known/assetlinks.json to verify the app and the
// site belong together — that's what removes the browser bar in the installed
// app. Configure via env (no code change needed when keys rotate):
//   ANDROID_PACKAGE_NAME  e.g. academy.dmaths.twa
//   ANDROID_CERT_SHA256   SHA-256 cert fingerprint(s) from Play Console →
//                         Setup → App signing (comma-separated to allow both
//                         the Play App Signing key and your upload key).
// Until both are set this returns [], which is valid and simply not verified.
export async function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME?.trim();
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const body =
    pkg && prints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: pkg,
              sha256_cert_fingerprints: prints,
            },
          },
        ]
      : [];

  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
