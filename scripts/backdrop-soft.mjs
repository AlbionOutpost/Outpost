#!/usr/bin/env node
// Writes the soft backdrop behind every page but the landing: the castle painting
// (public/albion/illustrations/backdrop-v1.webp) blurred, at 960px wide, as backdrop-v1-soft.webp.
// The blur hides the upscale, so one small file serves phones and desktops, and the browser
// never blurs a full-screen layer itself. Rerun after the painting changes.
import sharp from "sharp";

const dir = "public/albion/illustrations";
const info = await sharp(`${dir}/backdrop-v1.webp`)
  .resize({ width: 960 })
  .blur(3.2)
  .webp({ quality: 72, effort: 6 })
  .toFile(`${dir}/backdrop-v1-soft.webp`);
console.log(`backdrop-v1-soft.webp: ${info.width}×${info.height}, ${info.size} bytes`);
