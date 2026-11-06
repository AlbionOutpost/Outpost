#!/usr/bin/env node
// Writes smaller WebP widths of the activity card artwork next to the 800px originals, e.g.
// public/albion/activities/mists-solo-400w.webp. The cards offer them in a srcset so each screen
// downloads the width it draws: 400w covers a 1x desktop card (≈380 CSS px) and a 2x phone card
// on the homepage (≈170 CSS px); 600w covers 3x phones; 2x desktop keeps the 800px original.
// Same derivation as the originals (sharp, WebP quality 82, no crop or retouch); only the width
// changes. Idempotent: rerun after an artwork changes. `--check` writes nothing and fails if a
// variant is missing or has the wrong width.
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const ACTIVITY_WIDTHS = [400, 600];
const dir = path.resolve("public/albion/activities");
const check = process.argv.includes("--check");
const originals = (await readdir(dir)).filter(
  (f) => f.endsWith(".webp") && !/-\d+w\.webp$/.test(f),
);
let stale = 0;
let before = 0;
const after = Object.fromEntries(ACTIVITY_WIDTHS.map((w) => [w, 0]));
for (const file of originals) {
  const source = path.join(dir, file);
  const { size } = await stat(source);
  before += size;
  const { width = 0 } = await sharp(source).metadata();
  for (const target of ACTIVITY_WIDTHS) {
    const out = path.join(dir, file.replace(/\.webp$/, `-${target}w.webp`));
    const existing = await stat(out).catch(() => null);
    if (check) {
      const drawn = existing ? (await sharp(out).metadata()).width : 0;
      if (!existing || drawn !== Math.min(width, target)) {
        console.error(`missing or wrong width: ${path.relative(process.cwd(), out)}`);
        stale++;
      } else after[target] += existing.size;
      continue;
    }
    if (width && width < target) throw new Error(`${file} is narrower than ${target}px`);
    const info = await sharp(source)
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(out);
    after[target] += info.size;
  }
}
if (stale) process.exit(1);
console.log(
  `${originals.length} artworks: originals ${before} bytes; ` +
    ACTIVITY_WIDTHS.map((w) => `${w}w ${after[w]} bytes`).join("; "),
);
