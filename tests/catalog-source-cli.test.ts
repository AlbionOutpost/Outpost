import { expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { byteHash } from "../src/lib/catalog/verification";
it("prepares reproducible immutable offline artifacts and refuses corrupt cached output", async () => {
  const output = `.qa/test-game-sources-${randomUUID()}`;
  const folder = await mkdtemp(join(tmpdir(), "outpost-source-test-"));
  try {
    const data = Buffer.from(
      JSON.stringify([{ UniqueName: "T4_BAG", LocalizedNames: { "EN-US": "Bag" } }]),
    );
    await writeFile(join(folder, "input.json"), data);
    await writeFile(
      join(folder, "config.json"),
      JSON.stringify({
        id: "qa-fixture",
        repository: "qa/fixture",
        revision: "a".repeat(40),
        path: "items.json",
        sha256: byteHash(data),
        format: "ao-formatted-items-v1",
        gameVersion: null,
        rights: {
          approved: true,
          reference: "https://example.org/isolated-qa-fixture-only",
          reviewer: "QA fixture",
        },
        targetPatch: null,
      }),
    );
    const command = [
      "--import",
      import.meta.resolve("tsx"),
      resolve("scripts/sync-game-source.ts"),
      "--output",
      output,
      "--source",
      join(folder, "config.json"),
      "--input",
      join(folder, "input.json"),
    ];
    const run = () => spawnSync(process.execPath, command, { encoding: "utf8" });
    const first = run();
    expect(first.error).toBeUndefined();
    expect(first.status, first.stderr).toBe(0);
    const prepared = JSON.parse(first.stdout);
    expect(prepared.coverage).toMatchObject({
      sourceImported: 1,
      schemaValidated: 1,
      patchVerified: 0,
    });
    expect(prepared.databaseImported).toBe(false);
    const second = run();
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout).identity).toBe(prepared.identity);
    const originalSource = join(prepared.destination, "source.json");
    await writeFile(originalSource, "corrupted source bytes");
    const sourceFailure = run();
    expect(sourceFailure.status).toBe(1);
    expect(sourceFailure.stderr).toContain("identity mismatch");
    await writeFile(originalSource, data);
    const target = join(prepared.destination, "snapshot.json");
    const snapshot = JSON.parse(await readFile(target, "utf8"));
    snapshot.coverage.patchVerified = 1;
    await writeFile(target, JSON.stringify(snapshot));
    const failed = run();
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("identity mismatch");
    expect((await readdir(output)).filter((file) => file.startsWith("staging-"))).toEqual([]);
  } finally {
    await rm(folder, { recursive: true, force: true });
    await rm(output, { recursive: true, force: true });
  }
});
