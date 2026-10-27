import { readFile, mkdir, mkdtemp, writeFile, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  sourceDefinition,
  reviewEvidence,
  downloadSnapshot,
  normalizeSource,
  verifySnapshot,
  contentHash,
  validateImages,
} from "../src/lib/catalog/verification";
const args = process.argv.slice(2);
const option = (key: string) => {
  const index = args.indexOf(key);
  return index < 0 ? undefined : args[index + 1];
};
async function boundedJson(file: string, max = 10 * 1024 * 1024) {
  if ((await stat(file)).size > max) throw new Error("Input file too large");
  return JSON.parse(await readFile(file, "utf8"));
}
try {
  const config = option("--source");
  if (!config)
    throw new Error(
      "Usage: data:source --source config.json [--input snapshot.json] [--reviews reviews.json] [--images]",
    );
  const source = sourceDefinition.parse(await boundedJson(config));
  let bytes: Uint8Array;
  const local = option("--input");
  if (local) {
    if ((await stat(local)).size > 64 * 1024 * 1024) throw new Error("Source exceeds64MiB");
    bytes = await readFile(local);
  } else bytes = await downloadSnapshot(source);
  const reviews = option("--reviews"),
    evidence = reviewEvidence.parse(reviews ? await boundedJson(reviews) : []);
  // Validate source checksum and rights before optional external image requests.
  const initial = verifySnapshot(source, bytes, evidence);
  const images = args.includes("--images")
    ? await validateImages(normalizeSource(source, JSON.parse(new TextDecoder().decode(bytes))))
    : [];
  const snapshot = images.length ? verifySnapshot(source, bytes, evidence, { images }) : initial;
  const identity = contentHash(snapshot),
    root = option("--output") || ".qa/game-sources",
    destination = join(root, `${source.id}-${identity.slice(0, 24)}`);
  if (!/^\.qa\/[A-Za-z0-9_-]+$/.test(root))
    throw new Error("Output must be a named directory immediately under .qa");
  await mkdir(root, { recursive: true });
  const temp = await mkdtemp(join(root, "staging-"));
  try {
    await writeFile(join(temp, "snapshot.json"), JSON.stringify(snapshot, null, 2));
    await writeFile(join(temp, "source.json"), bytes);
    await writeFile(join(temp, "reviews.json"), JSON.stringify(evidence, null, 2));
    await writeFile(join(temp, "images.json"), JSON.stringify(images, null, 2));
    await writeFile(
      join(temp, "manifest.json"),
      JSON.stringify(
        {
          identity,
          source,
          normalizedSha256: snapshot.normalizedSha256,
          evidenceSha256: snapshot.evidenceSha256,
        },
        null,
        2,
      ),
    );
    try {
      await rename(temp, destination);
    } catch (error) {
      if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code || ""))
        throw error;
      for (const file of [
        "manifest.json",
        "snapshot.json",
        "source.json",
        "reviews.json",
        "images.json",
      ]) {
        const [previousBytes, preparedBytes] = await Promise.all([
          readFile(join(destination, file)),
          readFile(join(temp, file)),
        ]);
        if (!previousBytes.equals(preparedBytes))
          throw new Error("Existing snapshot identity mismatch");
      }
      const previous = JSON.parse(await readFile(join(destination, "manifest.json"), "utf8"));
      if (
        previous.identity !== identity ||
        contentHash(JSON.parse(await readFile(join(destination, "snapshot.json"), "utf8"))) !==
          identity
      )
        throw new Error("Existing snapshot identity mismatch");
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
  console.log(
    JSON.stringify({
      status: "PREPARED",
      destination,
      identity,
      coverage: snapshot.coverage,
      databaseImported: false,
      scope: snapshot.scope,
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      status: "BLOCKED",
      error: error instanceof Error ? error.message : "Source preparation failed",
    }),
  );
  process.exitCode = 1;
}
