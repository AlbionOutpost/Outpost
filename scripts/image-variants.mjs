#!/usr/bin/env node
// Writes narrower WebP copies of the large images the site draws small, next to each source
// (public/albion/activities/mists-solo.webp → mists-solo-400w.webp, -600w.webp), and lists
// them in src/lib/image-variants.json, which `variantSrcSet()` reads to build a `srcset`, so
// each screen downloads the width it draws. Sources: the activity artwork, the emblems in
// public/albion/icons, every guide cover named in public/library/grind-guides.json (whatever
// file it points to) and the Supporter band painting. Same derivation for all: sharp, WebP
// quality 82, width only, no crop or retouch; only widths at most 85% of the source are
// written, and the source stays the widest candidate. Idempotent: an existing variant of the
// right width is kept unless its source's hash changed (`--force` rewrites it). Rerun after
// any listed image or cover changes. `--check` writes nothing and fails if a variant or the
// manifest is missing or stale, or a variant file is no longer listed.
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { format, resolveConfig } from "prettier";
import sharp from "sharp";

const check = process.argv.includes("--check");
const force = process.argv.includes("--force");
const manifestPath = path.resolve("src/lib/image-variants.json");
const local = (src) =>
  typeof src === "string" && /^\/(?!api\/)[\w./-]+\.(webp|png|jpe?g|avif)$/.test(src);
const variantPath = (src, width) => src.replace(/\.\w+$/, `-${width}w.webp`);

const originals = async (dir) =>
  (await readdir(`public${dir}`))
    .filter((f) => f.endsWith(".webp") && !/-\d+w\.webp$/.test(f))
    .map((f) => `${dir}/${f}`);
const activities = await originals("/albion/activities");
const emblems = await originals("/albion/icons");
const guides = JSON.parse(await readFile("public/library/grind-guides.json", "utf8"));
const covers = guides.map((g) => g.cover?.src).filter(local);
/** Widths per use: activity cards (≈170–380 CSS px), emblems (24–56 CSS px), guide covers
 * (≈290–820 CSS px with `object-fit: cover`), the Supporter band (≈290–1040 CSS px). */
const groups = [
  [activities, [400, 600]],
  [emblems, [64, 128]],
  [covers, [400, 600, 800, 1200]],
  [["/scenes/supporter/crown-courtyard.webp"], [480, 720, 1040]],
];
const wanted = new Map();
for (const [sources, widths] of groups)
  for (const src of sources) wanted.set(src, [...new Set([...(wanted.get(src) ?? []), ...widths])]);

// The source's hash from the last run: a source repainted under the same name gets new variants.
const previous = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
const manifest = {};
let stale = 0;
let before = 0;
let written = 0;
for (const src of [...wanted.keys()].sort()) {
  const file = path.join("public", src);
  const { width = 0, height = 0 } = await sharp(file).metadata();
  const widths = wanted
    .get(src)
    .filter((w) => w <= width * 0.85)
    .sort((a, b) => a - b);
  const hash = createHash("sha256")
    .update(await readFile(file))
    .digest("hex")
    .slice(0, 16);
  const changed = previous[src]?.hash !== hash;
  manifest[src] = { width, height, hash, variants: widths };
  before += (await stat(file)).size;
  for (const target of widths) {
    const out = path.join("public", variantPath(src, target));
    const existing = await stat(out).catch(() => null);
    const drawn = existing ? (await sharp(out).metadata()).width : 0;
    if (existing && drawn === target && !changed && !force) continue;
    if (check) {
      console.error(`missing, wrong width or source changed: ${out}`);
      stale++;
      continue;
    }
    const info = await sharp(file)
      .resize({ width: target })
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    written += info.size;
  }
}
// A variant whose source or width is no longer listed (a cover moved, a width dropped).
const listed = new Set(
  Object.entries(manifest).flatMap(([src, { variants }]) =>
    variants.map((w) => path.join("public", variantPath(src, w))),
  ),
);
for (const dir of new Set([...wanted.keys()].map((src) => path.dirname(path.join("public", src)))))
  for (const f of await readdir(dir)) {
    const out = path.join(dir, f);
    if (!/-\d+w\.webp$/.test(f) || listed.has(out)) continue;
    console.error(`unlisted variant (delete it): ${out}`);
    stale++;
  }
if (stale && !check) process.exit(1);
// Written as Prettier formats it, so a rerun leaves the file unchanged.
const json = await format(JSON.stringify(manifest, null, 2), {
  ...(await resolveConfig(manifestPath)),
  filepath: manifestPath,
});
if (check) {
  const current = await readFile(manifestPath, "utf8").catch(() => "");
  if (current !== json) {
    console.error(`stale manifest: ${path.relative(process.cwd(), manifestPath)}`);
    stale++;
  }
  if (stale) {
    console.error("Run `node scripts/image-variants.mjs` and commit the result.");
    process.exit(1);
  }
} else await writeFile(manifestPath, json);
console.log(
  `${Object.keys(manifest).length} images (${before} bytes); ${written} bytes of new variants`,
);
