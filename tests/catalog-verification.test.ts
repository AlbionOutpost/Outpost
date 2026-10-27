import { expect, it, vi } from "vitest";
import { crc32, deflateSync } from "node:zlib";
import {
  sourceDefinition,
  byteHash,
  contentHash,
  verifySnapshot,
  downloadSnapshot,
  validateImages,
  verificationDataset,
  type VerificationItem,
  type SourceDefinition,
} from "../src/lib/catalog/verification";
import { validRendererPng } from "../src/lib/catalog/png-verification";
const item: VerificationItem = {
  id: "T4_BAG",
  name: "Bag",
  tier: 4,
  enchantment: 0,
  category: "Bag",
  weaponFamily: null,
  equippable: false,
  craftable: false,
  abilities: null,
  recipe: null,
  imageSha256: null,
};
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
function source(data = bytes([item])): SourceDefinition {
  return {
    id: "qa-source",
    repository: "ao-data/ao-bin-dumps",
    revision: "a".repeat(40),
    path: "formatted/items.json",
    sha256: byteHash(data),
    format: "outpost-reviewed-v1",
    gameVersion: "QA-build-not-a-game-patch",
    rights: {
      approved: true,
      reference: "https://example.org/qa-rights-fixture",
      reviewer: "QA fixture reviewer",
    },
    targetPatch: null,
  };
}
function chunk(name: string, data: Uint8Array) {
  const value = Buffer.concat([Buffer.from(name), data]),
    size = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(value));
  return Buffer.concat([size, value, crc]);
}
function png() {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(96);
  head.writeUInt32BE(96, 4);
  head[8] = 8;
  head[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(Buffer.alloc(96 * (1 + 96 * 4)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
function evidence(entry: VerificationItem, s: SourceDefinition) {
  return [
    {
      itemId: entry.id,
      itemSha256: contentHash(entry),
      sourceSha256: s.sha256,
      reviewer: "QA manual fixture",
      reviewedAt: "2020-01-01T00:00:00Z",
      patchId: "QA-patch",
      checks: ["identity", "category", "image"]
        .map((field) => ({
          field,
          verdict: "verified",
          reference: "https://example.org/qa-evidence",
          notes: "Isolated fixture evidence, not real game verification",
        }))
        .concat(
          ["family", "abilities", "recipe"].map((field) => ({
            field,
            verdict: "not-applicable",
            reference: "https://example.org/qa-evidence",
            notes: "Isolated fixture applicability evidence",
          })),
        ),
    },
  ];
}
it("never promotes a recent download or declared game version without review", () => {
  const s = source();
  s.targetPatch = {
    id: "QA-patch",
    reference: "https://example.org/patch-fixture",
    sourceRevision: s.revision!,
    confirmedBy: "QA fixture",
  };
  const result = verifySnapshot(s, bytes([item]));
  expect(result.coverage).toMatchObject({
    sourceImported: 1,
    schemaValidated: 1,
    manuallyVerified: 0,
    patchVerified: 0,
  });
});
it("binds manual and patch evidence to data, source revision and actual image bytes", async () => {
  const data = bytes([item]),
    s = source(data),
    images = await validateImages(
      [item],
      vi.fn(async () => new Response(png(), { headers: { "content-type": "image/png" } })),
    );
  const reviewed = { ...item, imageSha256: images[0].sha256 };
  const reviews = evidence(reviewed, s);
  expect(verifySnapshot(s, data, reviews, { images }).coverage).toMatchObject({
    manuallyVerified: 1,
    patchVerified: 0,
  });
  s.targetPatch = {
    id: "QA-patch",
    reference: "https://example.org/patch-fixture",
    sourceRevision: s.revision!,
    confirmedBy: "QA fixture",
  };
  expect(verifySnapshot(s, data, reviews, { images }).coverage.patchVerified).toBe(1);
  s.targetPatch.sourceRevision = "b".repeat(40);
  expect(verifySnapshot(s, data, reviews, { images }).coverage.patchVerified).toBe(0);
  expect(verifySnapshot(s, data, reviews).coverage.manuallyVerified).toBe(0);
});
it("invalidates review after source or item changes", () => {
  const s = source(),
    reviews = evidence(item, s),
    changed = bytes([{ ...item, name: "Changed QA label" }]);
  s.sha256 = byteHash(changed);
  const result = verifySnapshot(s, changed, reviews);
  expect(result.coverage.staleReviews).toBe(1);
  expect(result.coverage.patchVerified).toBe(0);
});
it("does not treat missing metadata as not-applicable", () => {
  const unknown = { ...item, equippable: null, category: null, craftable: null },
    s = source(bytes([unknown]));
  const result = verifySnapshot(s, bytes([unknown]), evidence(unknown, s));
  expect(result.coverage.manuallyVerified).toBe(0);
  expect(result.records[0].missingFields).toContain("abilities");
});
it("rejects changed bytes, duplicate evidence and duplicate item identities", () => {
  const s = source();
  expect(() => verifySnapshot(s, bytes([]))).toThrow("checksum");
  expect(() =>
    verifySnapshot(s, bytes([item]), [...evidence(item, s), ...evidence(item, s)]),
  ).toThrow("Duplicate review");
  expect(() => verificationDataset.parse([item, item])).toThrow();
});
it("validates recipe material references and cycles without inventing missing recipes", () => {
  const recipe = { outputCount: 1, materials: [{ id: "T4_CAPE", quantity: 1, returnable: false }] };
  expect(() => verificationDataset.parse([{ ...item, craftable: true, recipe }])).toThrow(
    "Missing recipe material",
  );
  expect(() =>
    verificationDataset.parse([
      { ...item, craftable: true, recipe },
      {
        ...item,
        id: "T4_CAPE",
        craftable: true,
        recipe: { ...recipe, materials: [{ id: "T4_BAG", quantity: 1, returnable: false }] },
      },
    ]),
  ).toThrow("cycle");
});
it("imports public-format names while leaving category, abilities and recipes unknown", () => {
  const data = bytes([
      { UniqueName: "T4_BAG", LocalizedNames: { "EN-US": "Bag" } },
      { UniqueName: "GOLD", LocalizedNames: { "EN-US": "Gold" } },
    ]),
    s = source(data);
  s.format = "ao-formatted-items-v1";
  const report = verifySnapshot(s, data);
  expect(report.coverage).toMatchObject({
    sourceImported: 1,
    excludedSourceRecords: 1,
    missingCategories: 1,
    patchVerified: 0,
  });
  expect(report.items[0].abilities).toBeNull();
});
it("makes identical input produce identical hashes and reports", () => {
  const s = source();
  expect(verifySnapshot(s, bytes([item]))).toEqual(verifySnapshot(s, bytes([item])));
  expect(contentHash({ b: 2, a: 1 })).toBe(contentHash({ a: 1, b: 2 }));
});
it("blocks unapproved sources before any network request", async () => {
  const fetcher = vi.fn();
  const s = source();
  s.rights.approved = false;
  await expect(downloadSnapshot(s, fetcher)).rejects.toThrow("blocked");
  expect(fetcher).not.toHaveBeenCalled();
});
it("pins downloads to a commit, verifies bytes and denies redirects", async () => {
  const data = bytes([item]),
    s = source(data),
    fetcher = vi.fn(async () => new Response(data));
  await expect(downloadSnapshot(s, fetcher)).resolves.toEqual(data);
  expect(fetcher).toHaveBeenCalledWith(
    `https://raw.githubusercontent.com/ao-data/ao-bin-dumps/${"a".repeat(40)}/formatted/items.json`,
    expect.objectContaining({ redirect: "error" }),
  );
  await expect(
    downloadSnapshot(
      s,
      vi.fn(async () => new Response("bad")),
    ),
  ).rejects.toThrow("checksum");
});
it("rejects unsafe source paths and mutable branch names", () => {
  expect(sourceDefinition.safeParse({ ...source(), revision: "master" }).success).toBe(false);
  expect(sourceDefinition.safeParse({ ...source(), path: "../secrets.json" }).success).toBe(false);
  expect(
    sourceDefinition.safeParse({ ...source(), repository: "https://localhost/secret" }).success,
  ).toBe(false);
});
it("checks PNG CRC, dimensions, complete image data and bounded inflation", () => {
  const valid = png();
  expect(validRendererPng(valid)).toBe(true);
  expect(validRendererPng(valid.subarray(0, 24))).toBe(false);
  const corrupt = Buffer.from(valid);
  corrupt[45] ^= 1;
  expect(validRendererPng(corrupt)).toBe(false);
});
it("limits image checks to ten and never treats SVG fallback as an available icon", async () => {
  const fetcher = vi.fn(
    async () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
  );
  const result = await validateImages(
    Array.from({ length: 11 }, () => item),
    fetcher,
  );
  expect(result).toHaveLength(10);
  expect(result.every((r) => !r.formatValidated)).toBe(true);
});

it("counts missing English names as excluded instead of fabricating labels", () => {
  const data = bytes([
      { UniqueName: "T4_BAG", LocalizedNames: { "EN-US": "Bag" } },
      { UniqueName: "T4_CAPE", LocalizedNames: { "EN-US": null } },
      { UniqueName: "T4_MAIN_SWORD", LocalizedNames: { "EN-US": " " } },
    ]),
    s = source(data);
  s.format = "ao-formatted-items-v1";
  expect(verifySnapshot(s, data).coverage).toMatchObject({
    sourceImported: 1,
    excludedSourceRecords: 2,
    patchVerified: 0,
  });
});
