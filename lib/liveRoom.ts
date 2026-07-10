import { createHash } from "crypto";

// Where the video runs. Defaults to Jitsi's free public server; set JITSI_DOMAIN
// to your own self-hosted Jitsi or an 8x8 JaaS tenant for production.
export const JITSI_DOMAIN = process.env.JITSI_DOMAIN || "meet.jit.si";

// A stable but non-obvious room name for a class. On the public server anyone who
// knows the exact room name can join, so we salt it with a server secret — only
// the app (and thus only users allowed onto the class page) can derive it.
export function roomNameFor(classId: string) {
  const salt = process.env.LIVE_ROOM_SECRET || "dmaths-live";
  const h = createHash("sha256").update(`${salt}:${classId}`).digest("hex").slice(0, 12);
  return `DMaths-${classId.replace(/-/g, "").slice(0, 8)}-${h}`;
}
