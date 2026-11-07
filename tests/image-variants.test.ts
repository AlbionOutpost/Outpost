import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import guides from "../public/library/grind-guides.json";
import manifest from "../src/lib/image-variants.json";
import { variantSize, variantSrcSet } from "../src/lib/image-variants";

const listed = manifest as Record<
  string,
  { width: number; height: number; hash: string; variants: number[] }
>;
const rerun = "run `node scripts/image-variants.mjs` and commit its output";

describe("image variants", () => {
  it("covers every guide cover and the Supporter painting", () => {
    const covers = guides.flatMap((g) => (g.cover?.src ? [g.cover.src] : []));
    for (const src of [...covers, "/scenes/supporter/crown-courtyard.webp"])
      expect(listed[src], `${src} has no variants: ${rerun}`).toBeDefined();
  });

  it("lists only files that exist, narrower than their source", () => {
    for (const [src, { width, variants }] of Object.entries(listed)) {
      expect(existsSync(`public${src}`), src).toBe(true);
      for (const w of variants) {
        expect(w).toBeLessThan(width);
        expect(existsSync(`public${src.replace(/\.\w+$/, `-${w}w.webp`)}`), `${src} ${w}w`).toBe(
          true,
        );
      }
    }
  });

  it("builds a width srcset with the source as the widest candidate", () => {
    expect(variantSrcSet("/albion/activities/mists-solo.webp")).toBe(
      "/albion/activities/mists-solo-400w.webp 400w, /albion/activities/mists-solo-600w.webp 600w, /albion/activities/mists-solo.webp 800w",
    );
    expect(variantSize("/albion/activities/mists-solo.webp")).toEqual({ width: 800, height: 667 });
    expect(variantSrcSet("/brand/discord-symbol.svg")).toBeUndefined();
  });
});

describe("static asset headers", () => {
  const headers = readFileSync("public/_headers", "utf8");
  const rule = (path: string) =>
    headers.match(new RegExp(`^${path.replace(/[*/]/g, "\\$&")}\\n((?:  .+\\n?)+)`, "m"))?.[1] ??
    "";

  it("caches hashed build output for good and artwork for a month", () => {
    expect(rule("/_next/static/*")).toContain("Cache-Control: public, max-age=31536000, immutable");
    for (const path of ["/albion/*", "/brand/*", "/scenes/*", "/library/media/*", "/fonts/*"])
      expect(rule(path), path).toContain("max-age=2592000, stale-while-revalidate=604800");
  });

  it("never gives library JSON, pages or the API a long cache", () => {
    expect(headers).not.toMatch(/^\/library\/\*$/m);
    expect(headers).not.toMatch(/^\/api/m);
    expect(headers).not.toMatch(/^\/\*\n(?:  .+\n)*  Cache-Control/m);
  });
});
