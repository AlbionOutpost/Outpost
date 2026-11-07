import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import config from "../next.config";
import { guideRedirects } from "../src/lib/guide-redirects";
import {
  guideDek,
  guideReferences,
  guideSections,
  linkedGuides,
  relatedGuides,
} from "../src/lib/guide-article";
import type { LibraryGuide } from "../src/lib/grind-library-types";

const guides: LibraryGuide[] = JSON.parse(readFileSync("public/library/grind-guides.json", "utf8"));
const slugs = new Set(guides.map((g) => g.slug));
const redirected = new Set(guides.flatMap((g) => g.previousSlugs ?? []));
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|mjs)$/.test(name) ? [path] : [];
  });

describe("guide URLs", () => {
  it("names every guide by a unique, readable slug", () => {
    expect(slugs.size).toBe(guides.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("answers every earlier slug with a permanent redirect to the guide's current one", async () => {
    const previous = guides.flatMap((g) => (g.previousSlugs ?? []).map((old) => [old, g.slug]));
    expect(previous.length).toBeGreaterThanOrEqual(10);
    const redirects = await config.redirects!();
    expect(redirects).toEqual(guideRedirects());
    for (const [old, current] of previous) {
      expect(slugs.has(old), `${old} is still a live slug`).toBe(false);
      expect(redirects).toContainEqual({
        source: `/guides/${old}`,
        destination: `/guides/${current}`,
        permanent: true,
      });
    }
    expect(new Set(previous.map(([old]) => old)).size).toBe(previous.length);
  });

  it("links only to guides that exist, from guide text and from the app's own code", () => {
    for (const guide of guides)
      for (const slug of linkedGuides(guide.content))
        expect(slugs.has(slug), `${guide.slug} links to /guides/${slug}`).toBe(true);
    for (const file of [...files("src"), ...files("e2e"), ...files("scripts")])
      for (const [, slug] of readFileSync(file, "utf8").matchAll(
        /["'`]\/guides\/([a-z0-9-]+)(?=["'`?#])/g,
      ))
        // The redirect spec visits an old slug on purpose
        expect(
          slugs.has(slug) || (file.startsWith("e2e") && redirected.has(slug)),
          `${file} links to /guides/${slug}`,
        ).toBe(true);
  });
});

describe("guide reader", () => {
  const silver = guides.find((g) => g.slug === "making-silver")!;

  it("cuts a guide into its sections without losing any text", () => {
    for (const guide of guides) {
      const { intro, sections } = guideSections(guide.content);
      const h2 = guide.content.filter((n) => typeof n !== "string" && n.tag === "h2").length;
      expect(sections).toHaveLength(h2);
      expect(intro.length + sections.reduce((n, s) => n + s.nodes.length, 0) + h2).toBe(
        guide.content.length,
      );
    }
    const { sections } = guideSections(silver.content);
    expect(sections.find((s) => s.title.startsWith("Mistakes"))?.tone).toBe("caution");
  });

  it("keeps the standfirst short and from the guide's own words", () => {
    for (const guide of guides) {
      const dek = guideDek(guide);
      expect(dek.length, guide.slug).toBeLessThanOrEqual(150);
      if (!guide.dek) expect(guide.summary.startsWith(dek.replace(/\.$/, ""))).toBe(true);
    }
  });

  it("lists the tools and items a guide links to, and the guides it is closest to", () => {
    const refs = guideReferences(silver.content);
    expect(refs.tools.map((t) => t.href)).toContain("/tools/refining");
    expect(refs.items.map((i) => i.id)).toContain("T3_2H_TOOL_PICK");
    const related = relatedGuides(silver, guides);
    expect(related).toHaveLength(3);
    expect(related[0]).toMatchObject({ reason: "Linked in this guide" });
    for (const { guide } of related) expect(guide.slug).not.toBe(silver.slug);
  });
});
