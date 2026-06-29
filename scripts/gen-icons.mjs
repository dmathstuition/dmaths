// Generate the PWA icon set from the square brand logo.
// Run once (or after the logo changes):  node scripts/gen-icons.mjs
//
// The base logo (public/dmathslogo.png) is dark artwork on a transparent
// background, so every icon is composited onto a WHITE square to stay visible
// on any home-screen / launcher background. Maskable gets extra padding so
// Android's circular/squircle mask never clips the mark.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/dmathslogo.png";
const OUT = "public/icons";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function gen({ size, pad, out }) {
  const inner = Math.round(size * (1 - pad * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${out}`);
  console.log(`✓ ${OUT}/${out}  (${size}px, ${Math.round(pad * 100)}% padding)`);
}

await mkdir(OUT, { recursive: true });
await gen({ size: 192, pad: 0.1,  out: "icon-192.png" });
await gen({ size: 512, pad: 0.1,  out: "icon-512.png" });
await gen({ size: 512, pad: 0.2,  out: "maskable-512.png" });  // safe-zone padding
await gen({ size: 180, pad: 0.1,  out: "apple-touch-icon.png" });
console.log("Done.");
