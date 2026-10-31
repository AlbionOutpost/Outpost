// Writes public/library/grind-activities.json at build time: the landing page's builds-by-
// activity summary. The Cloudflare runtime reads this small file instead of the full archive.
import { readFileSync, writeFileSync } from "node:fs";
import { summariseActivities } from "../src/lib/library-activities";
import type { LibraryBuild } from "../src/lib/grind-library-types";

const builds = JSON.parse(
  readFileSync("public/library/grind-builds.json", "utf8"),
) as LibraryBuild[];
writeFileSync("public/library/grind-activities.json", JSON.stringify(summariseActivities(builds)));
console.log("Wrote the landing activity summary.");
