# Self-hosting Jitsi for D-Maths live classes

The in-portal live classroom runs on Jitsi. Out of the box it uses the **free public
server** (`meet.jit.si`) — great for launching and testing, but it carries Jitsi
branding, has fair-use limits, and makes "moderator" whoever joins first.

For production you want your **own Jitsi**, which gives you three things this app is
already wired for:

1. **Your branding** on the room (logo, colours, name).
2. **JWT auth** so the *tutor* is always the moderator (mute-all, kick, lock) and
   learners never are — set `JITSI_APP_ID` / `JITSI_APP_SECRET` and the app signs a
   token per class automatically (`lib/jitsiJwt.ts`).
3. **Recording** — with a recorder (Jibri) attached, the host auto-starts recording
   and the finished link is filed straight into the class's recordings
   (set `JITSI_RECORDING=true`).

You do **not** have to touch the Vercel app for any of this beyond a few env vars —
the media server is separate infrastructure.

---

## 1. Get a server

A small cloud VM works for a handful of concurrent classes. Rough guide:

- **2 vCPU / 4 GB RAM** — a class or two at a time.
- **4 vCPU / 8 GB RAM** — comfortable for several concurrent classes.
- Recording (Jibri) is CPU-heavy — give it its own **2 vCPU / 4 GB** or a separate box.
- Open ports: **80/443 TCP** (web), **10000/UDP** (media), **22 TCP** (ssh).
- Point a DNS record, e.g. `live.dmaths.<your-domain>`, at the server's IP.

## 2. Install with Docker (docker-jitsi-meet)

```bash
git clone https://github.com/jitsi/docker-jitsi-meet && cd docker-jitsi-meet
cp env.example .env
./gen-passwords.sh            # fills in the internal secrets

# In .env set at least:
#   PUBLIC_URL=https://live.dmaths.your-domain.com
#   ENABLE_LETSENCRYPT=1
#   LETSENCRYPT_DOMAIN=live.dmaths.your-domain.com
#   LETSENCRYPT_EMAIL=you@your-domain.com
#   ENABLE_AUTH=1
#   AUTH_TYPE=jwt
#   JWT_APP_ID=dmaths
#   JWT_APP_SECRET=<a-long-random-string>
#   ENABLE_GUESTS=1            # learners join via the app's JWT, not a login

mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
docker compose up -d
```

Then on the **Vercel** side set:

```
JITSI_DOMAIN=live.dmaths.your-domain.com
JITSI_APP_ID=dmaths            # must equal JWT_APP_ID
JITSI_APP_SECRET=<same as JWT_APP_SECRET>
LIVE_ROOM_SECRET=<a-long-random-string>
```

Redeploy. Tutors/admin now join as moderator automatically; learners as members.

> Also add your Jitsi domain to the CSP in `next.config.mjs` if you change it from
> `meet.jit.si` — the `script-src` and `frame-src` entries plus the
> `Permissions-Policy` delegations currently name `meet.jit.si`.

## 3. Branding

In `~/.jitsi-meet-cfg/web/custom-config.js` / `custom-interface_config.js`:

```js
// custom-interface_config.js
APP_NAME = 'D-Maths Live';
DEFAULT_LOGO_URL = 'https://your-domain/logo.png';
DEFAULT_BACKGROUND = '#0A2A4F';
SHOW_JITSI_WATERMARK = false;
```

Restart the web container: `docker compose restart web`.

## 4. Recording (optional)

Add a **Jibri** container (see the `docker-jitsi-meet` docs → "Recording"). Once
Jibri is healthy, set on Vercel:

```
JITSI_RECORDING=true
```

The host's browser then calls `startRecording` automatically on join, and when Jitsi
emits the recording link the app POSTs it to `/api/classes/recording`, which stores
it on the class and notifies the roster — the same "Watch recording" flow learners
already use. (JaaS works the same way and needs no Jibri of your own.)

## 5. Prefer managed? 8x8 JaaS

If you'd rather not run servers, **8x8 JaaS** gives you a hosted Jitsi with JWT and
recording. Set `JITSI_DOMAIN=8x8.vc`, `JITSI_APP_ID=<your JaaS AppID>`, and use the
JaaS API key as the secret (JaaS uses an RS256 key — if you go this route, tell me
and I'll switch `lib/jitsiJwt.ts` to RS256 with your key id).
