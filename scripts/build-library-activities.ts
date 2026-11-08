// Writes public/library/grind-activities.json (the landing page's builds-by-activity summary)
// and grind-comp-weapons.json (Comps by activity's weapon overlay) at build time. The
// Cloudflare runtime reads these small files instead of the full archive.
import { readFileSync, writeFileSync } from "node:fs";
import { summariseActivities, summariseCompWeapons } from "../src/lib/library-activities";
import { byLikes, listedBuild } from "../src/lib/library-scope";
import type { LibraryBuild, LibraryComposition } from "../src/lib/grind-library-types";

const builds = JSON.parse(
  readFileSync("public/library/grind-builds.json", "utf8"),
) as LibraryBuild[];
writeFileSync(
  "public/library/grind-activities.json",
  JSON.stringify(summariseActivities(builds.filter(listedBuild).sort(byLikes))),
);
// Comps by activity: the weapons each Group Build category's comps carry (a few KB)
const comps = JSON.parse(
  readFileSync("public/library/grind-compositions.json", "utf8"),
) as LibraryComposition[];
writeFileSync(
  "public/library/grind-comp-weapons.json",
  JSON.stringify(summariseCompWeapons(comps, builds)),
);
console.log("Wrote the landing activity summary and the comp weapons per activity.");
