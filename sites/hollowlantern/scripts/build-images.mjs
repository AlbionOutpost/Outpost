#!/usr/bin/env node
// Regenerates the raster images in public/ from the SVG sources.
// Uses sharp and Playwright from the Outpost repo's node_modules (run `npm ci` at the repo root).
//   node sites/hollowlantern/scripts/build-images.mjs            icons, grain, Open Graph card
//   node sites/hollowlantern/scripts/build-images.mjs --outpost  also recaptures albionoutpost.com
// Set CHROMIUM_PATH to use a specific Chromium binary.
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(site, "public");
const img = join(pub, "assets/img");
const repoPublic = join(site, "../../public");

const favicon = await readFile(join(pub, "favicon.svg"));
const icon = (size) =>
  sharp(favicon, { density: 72 * (size / 64) * 2 })
    .resize(size, size)
    .png();

// favicon.ico: 16 and 32px PNG frames.
const frames = await Promise.all([16, 32].map((s) => icon(s).toBuffer()));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((png, i) => {
  const size = [16, 32][i];
  const at = 6 + 16 * i;
  header.writeUInt8(size, at);
  header.writeUInt8(size, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
await writeFile(join(pub, "favicon.ico"), Buffer.concat([header, ...frames]));

// Apple touch icon: the mark on the night background, with safe padding.
await sharp({ create: { width: 180, height: 180, channels: 4, background: "#121316" } })
  .composite([{ input: await icon(132).toBuffer(), top: 22, left: 24 }])
  .png()
  .toFile(join(pub, "apple-touch-icon.png"));

// Fine grain for the page background: white noise, mostly transparent.
const n = 160;
const noise = Buffer.alloc(n * n * 4);
for (let i = 0; i < n * n; i++) {
  const v = Math.random() * 255;
  noise.set([v, v, v, Math.random() < 0.5 ? 0 : 255], i * 4);
}
await sharp(noise, { raw: { width: n, height: n, channels: 4 } })
  .png({ palette: true, colours: 16 })
  .toFile(join(img, "grain.png"));

// Outpost's own mark, for its project card.
for (const s of [112]) {
  await sharp(join(repoPublic, "brand/outpost-mark.png"))
    .resize(s, s)
    .png({ palette: true })
    .toFile(join(img, `outpost-mark-${s}.png`));
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
});

if (process.argv.includes("--outpost")) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  await page.goto("https://albionoutpost.com/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const shot = await page.screenshot();
  for (const w of [640, 1200]) {
    await sharp(shot)
      .resize(w)
      .webp({ quality: 78 })
      .toFile(join(img, `outpost-home-${w}.webp`));
  }
  await page.close();
}

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(pathToFileURL(join(site, "scripts/og-card.html")).href);
await og.evaluate(() => document.fonts.ready);
await sharp(await og.screenshot())
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(join(img, "og.jpg"));
await browser.close();
console.log("images written");
