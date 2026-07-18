# Publishing D-Maths to Google Play (TWA)

The D-Maths PWA can be wrapped as a **Trusted Web Activity (TWA)** — a thin Android
app that opens the live site full-screen (no browser bar) and installs from the Play
Store. Users get real push notifications and a store presence, while you keep shipping
by just deploying the website (the app always loads the live URL).

> **Apple note:** there is no equivalent for the Apple App Store — Apple doesn't accept
> plain PWA wrappers. On iPhone, "Add to Home Screen" in Safari is the install path (the
> in-app **Get the app** button already guides users through it).

Everything in the app is already wired for this:
- `twa-manifest.json` (repo root) — the Bubblewrap build config, pre-filled for D-Maths.
- `app/.well-known/assetlinks.json/route.ts` — serves Digital Asset Links from
  `ANDROID_PACKAGE_NAME` + `ANDROID_CERT_SHA256` env vars (this is what removes the URL bar).
- `app/manifest.ts` — the web manifest (`/manifest.webmanifest`) the app is built from.

Package id: **`academy.dmaths.twa`** · Host: **`dmaths.academy`**

---

## Prerequisites
- A **Google Play Developer account** (one-time $25).
- **Node 18+** and a **JDK 17** installed (Bubblewrap installs the Android SDK for you).

## Option A — Bubblewrap CLI (recommended)

```bash
npm i -g @bubblewrap/cli

# From a fresh folder (NOT this repo — the Android project lives on its own):
bubblewrap init --manifest https://dmaths.academy/manifest.webmanifest
#   • Accept the detected values (they match twa-manifest.json in this repo).
#   • Package name:  academy.dmaths.twa
#   • When asked to create a signing key, say YES and KEEP the keystore safe
#     (android.keystore + the passwords). Losing it means you can never update the app.

bubblewrap build
#   → produces app-release-bundle.aab  (upload this to Play)
#   → also prints the SHA-256 fingerprint of your signing key
```

Copy the generated `twa-manifest.json` over the one in this repo if you tweak anything,
so the config is version-controlled.

## Option B — PWABuilder (no CLI)
1. Go to **https://www.pwabuilder.com**, enter **https://dmaths.academy**.
2. **Package for stores → Android → Download**. Choose "Signing key: create new" (save
   the `.keystore` and passwords it gives you).
3. You get an `.aab` to upload and the `assetlinks.json` fingerprint.

---

## Wire up Digital Asset Links (removes the browser bar)
1. From the build output (or Play Console → **Setup → App signing**), copy the
   **SHA-256 certificate fingerprint(s)**. Include **both** the *upload key* and Google's
   *Play App Signing* key once the app is on Play.
2. In **Vercel → Settings → Environment Variables** set:
   - `ANDROID_PACKAGE_NAME` = `academy.dmaths.twa`
   - `ANDROID_CERT_SHA256` = `AB:CD:...` (comma-separate multiple fingerprints)
3. **Redeploy.** Verify it's live: open `https://dmaths.academy/.well-known/assetlinks.json`
   — it should list your package + fingerprints (empty `[]` means the env vars aren't set yet).

## Upload to Play Console
1. **Create app** → name "D-Maths", category **Education**.
2. **Production → Create release** → upload the `.aab`.
3. Fill the **store listing** (draft below), **content rating**, **data safety**, and
   **target audience** (this app is for minors — declare it and follow the Families policy).
4. Submit for review (first review can take a few days).

---

## Store listing draft (copy/paste, then edit)

- **App name:** D-Maths
- **Short description (≤80):** Live online maths, science & coding tuition — with a portal built for results.
- **Full description:**
  > D-Maths Tuition Centre is a virtual learning community for students across Nigeria.
  > Join live online classes in mathematics, sciences and coding, with focused prep for
  > WAEC, JAMB, IGCSE, SAT and A-Levels.
  >
  > • Live video classes you can join from home
  > • A personal portal that tracks grades, attendance, streaks and behaviour
  > • Assignments and computer-based tests
  > • An in-browser coding playground (Python, web) and Colab-style notebooks
  > • A friendly AI study helper that gives hints, not answers
  > • Class reminders and instant notifications
  >
  > Already enrolled? Sign in with your Student ID. New? Register in minutes.
- **Graphics needed:** app icon (512×512 — use `/public/icons/icon-512.png`), a feature
  graphic (1024×500), and at least 2 phone screenshots (grab them from the live app).
- **Contact:** dmathstuition@gmail.com · **Website:** https://dmaths.academy
- **Privacy policy URL:** https://dmaths.academy/privacy

## Updating later
The app just loads the live site, so **most changes need no new app version** — deploy the
website as usual. Only ship a new `.aab` when you change the package config (icon, name,
version). Bump `appVersionCode` in `twa-manifest.json` and re-run `bubblewrap build`.
