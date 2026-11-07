import { readFileSync } from "node:fs";
import { join } from "node:path";

/** A guide's earlier URLs, each answered with a permanent (308) redirect to its current slug.
 * Read from `previousSlugs` in public/library/grind-guides.json by next.config.ts, so a rename
 * is one data edit and old links, bookmarks and search results keep working. */
export function guideRedirects(root = process.cwd()) {
  const guides: { slug: string; previousSlugs?: string[] }[] = JSON.parse(
    readFileSync(join(root, "public/library/grind-guides.json"), "utf8"),
  );
  return guides.flatMap((guide) =>
    (guide.previousSlugs ?? []).map((previous) => ({
      source: `/guides/${previous}`,
      destination: `/guides/${guide.slug}`,
      permanent: true,
    })),
  );
}
