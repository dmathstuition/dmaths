import { createHmac } from "crypto";

// Signs a Jitsi JWT (HS256) so a self-hosted Jitsi (or 8x8 JaaS) can trust who is
// a moderator. Only active when JITSI_APP_ID + JITSI_APP_SECRET are set — on the
// free public server there's no JWT and this returns null (moderator falls back to
// "first to join"). Matches the docker-jitsi-meet token format.
const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function makeJitsiToken(opts: {
  domain: string; room: string; name: string; email?: string; id?: string; moderator: boolean;
}): string | null {
  const appId = process.env.JITSI_APP_ID;
  const secret = process.env.JITSI_APP_SECRET;
  if (!appId || !secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    aud: appId,
    iss: appId,
    sub: process.env.JITSI_SUB || opts.domain,
    room: opts.room,
    iat: now,
    nbf: now - 10,
    exp: now + 4 * 60 * 60, // 4h
    moderator: opts.moderator,
    context: {
      user: {
        name: opts.name,
        email: opts.email || undefined,
        id: opts.id || undefined,
        moderator: opts.moderator ? "true" : "false",
        affiliation: opts.moderator ? "owner" : "member",
      },
    },
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${b64url(sig)}`;
}
