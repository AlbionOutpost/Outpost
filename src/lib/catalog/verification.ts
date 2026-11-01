import { validRendererPng } from "./png-verification";
import { createHash } from "node:crypto";
import { z } from "zod";
import { equipmentSlots } from "../albion/equipment-catalog";
import { itemIconUrl } from "../albion/item-renderer";
import { catalogItem } from "./validation";

const https = z.url().refine((value) => {
  const u = new URL(value);
  return u.protocol === "https:" && !u.username && !u.password;
});
const sha = z.string().regex(/^[a-f0-9]{64}$/);
export const verificationFields = [
  "identity",
  "category",
  "family",
  "abilities",
  "recipe",
  "image",
] as const;
export const verificationItem = z
  .object({
    id: catalogItem.shape.id,
    name: catalogItem.shape.name,
    tier: catalogItem.shape.tier,
    enchantment: catalogItem.shape.enchantment,
    category: z.enum([...equipmentSlots, "Resource", "Material", "Artifact", "Other"]).nullable(),
    weaponFamily: z.string().trim().min(1).max(100).nullable(),
    equippable: z.boolean().nullable(),
    craftable: z.boolean().nullable(),
    abilities: catalogItem.shape.abilities.nullable(),
    recipe: catalogItem.shape.recipe,
    imageSha256: sha.nullable(),
  })
  .superRefine((item, ctx) => {
    const match = /^T([1-8])_.+?(?:@([1-4]))?$/.exec(item.id);
    if (Number(match?.[1]) !== item.tier || Number(match?.[2] || 0) !== item.enchantment)
      ctx.addIssue({ code: "custom", message: "Item variant identity mismatch" });
    if (item.recipe) {
      const ids = item.recipe.materials.map((m) => m.id);
      if (new Set(ids).size !== ids.length || ids.includes(item.id))
        ctx.addIssue({ code: "custom", message: "Duplicate or self-referencing recipe materials" });
      if (item.craftable !== true)
        ctx.addIssue({ code: "custom", message: "Recipe requires explicit craftable status" });
    }
    if (item.abilities) {
      const ids = item.abilities.map((a) => `${a.slot}:${a.id}`);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({ code: "custom", message: "Duplicate ability mapping" });
    }
  });
export const verificationDataset = z
  .array(verificationItem)
  .min(1)
  .max(50000)
  .superRefine((items, ctx) => {
    if (new Set(items.map((i) => i.id)).size !== items.length)
      ctx.addIssue({ code: "custom", message: "Duplicate item identifiers" });
    const byId = new Map(items.map((i) => [i.id, i]));
    const visiting = new Set<string>(),
      complete = new Set<string>();
    function visit(id: string) {
      if (visiting.has(id)) {
        ctx.addIssue({ code: "custom", message: `Recipe dependency cycle: ${id}` });
        return;
      }
      if (complete.has(id)) return;
      visiting.add(id);
      for (const m of byId.get(id)?.recipe?.materials || []) {
        if (!byId.has(m.id))
          ctx.addIssue({ code: "custom", message: `Missing recipe material: ${m.id}` });
        else visit(m.id);
      }
      visiting.delete(id);
      complete.add(id);
    }
    for (const item of items) visit(item.id);
  });
export type VerificationItem = z.infer<typeof verificationItem>;
export const sourceDefinition = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  revision: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .nullable(),
  path: z
    .string()
    .regex(/^[A-Za-z0-9_/-]+\.json$/)
    .refine((p) => !p.includes("..") && !p.startsWith("/")),
  sha256: sha.nullable(),
  format: z.enum(["ao-formatted-items-v1", "outpost-reviewed-v1"]),
  gameVersion: z.string().min(1).max(100).nullable(),
  rights: z.object({
    approved: z.boolean(),
    reference: https.nullable(),
    reviewer: z.string().trim().min(1).max(100).nullable(),
  }),
  targetPatch: z
    .object({
      id: z.string().min(1).max(100),
      reference: https,
      sourceRevision: z.string().regex(/^[a-f0-9]{40}$/),
      confirmedBy: z.string().trim().min(1).max(100),
    })
    .nullable(),
});
export type SourceDefinition = z.infer<typeof sourceDefinition>;
export const reviewEvidence = z
  .array(
    z.object({
      itemId: catalogItem.shape.id,
      itemSha256: sha,
      sourceSha256: sha,
      reviewer: z.string().trim().min(1).max(100),
      reviewedAt: z.iso.datetime(),
      checks: z
        .array(
          z.object({
            field: z.enum(verificationFields),
            verdict: z.enum(["verified", "not-applicable"]),
            reference: https,
            notes: z.string().trim().min(10).max(2000),
          }),
        )
        .max(6),
      patchId: z.string().min(1).max(100).nullable(),
    }),
  )
  .max(50000);
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function contentHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
export function byteHash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
export function sourceUrl(source: SourceDefinition) {
  if (!source.revision) throw new Error("Pinned source revision required");
  return `https://raw.githubusercontent.com/${source.repository}/${source.revision}/${source.path}`;
}
export function readySource(source: SourceDefinition) {
  if (
    !source.revision ||
    !source.sha256 ||
    !source.rights.approved ||
    !source.rights.reference ||
    !source.rights.reviewer
  )
    throw new Error(
      "Source synchronization blocked: pinned revision, checksum and recorded reuse approval required",
    );
}
export function normalizeSource(source: SourceDefinition, raw: unknown): VerificationItem[] {
  if (source.format === "outpost-reviewed-v1")
    return verificationDataset.parse(raw).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const input = z
    .array(
      z.object({
        UniqueName: z.string().max(100),
        LocalizedNames: z
          .object({ "EN-US": z.string().max(120).nullable().optional() })
          .nullable()
          .optional(),
      }),
    )
    .max(100000)
    .parse(raw);
  // This source adapter supplies identity/names only; it never infers abilities or recipes from IDs.
  return verificationDataset
    .parse(
      input
        .filter(
          (i) =>
            /^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(i.UniqueName) &&
            i.LocalizedNames?.["EN-US"]?.trim(),
        )
        .map((i) => ({
          id: i.UniqueName,
          name: i.LocalizedNames!["EN-US"]!.trim(),
          tier: Number(i.UniqueName[1]),
          enchantment: Number(i.UniqueName.match(/@([1-4])$/)?.[1] || 0),
          category: null,
          weaponFamily: null,
          equippable: null,
          craftable: null,
          abilities: null,
          recipe: null,
          imageSha256: null,
        })),
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function present(item: VerificationItem, field: (typeof verificationFields)[number]) {
  switch (field) {
    case "identity":
      return true;
    case "category":
      return item.category !== null && item.equippable !== null;
    case "family":
      return item.weaponFamily !== null;
    case "abilities":
      return item.abilities !== null;
    case "recipe":
      return item.craftable === true && item.recipe !== null;
    case "image":
      return item.imageSha256 !== null;
  }
}
function notApplicable(item: VerificationItem, field: (typeof verificationFields)[number]) {
  return field === "family"
    ? item.category !== null && item.category !== "Main hand"
    : field === "abilities"
      ? item.equippable === false
      : field === "recipe"
        ? item.craftable === false
        : false;
}
export function verifySnapshot(
  source: SourceDefinition,
  bytes: Uint8Array,
  evidence: unknown = [],
  options: { now?: number; images?: ImageCheck[] } = {},
) {
  const now = options.now ?? Date.now();
  source = sourceDefinition.parse(source);
  readySource(source);
  if (byteHash(bytes) !== source.sha256) throw new Error("Source checksum mismatch");
  const raw = JSON.parse(new TextDecoder().decode(bytes));
  const items = normalizeSource(source, raw),
    reviews = reviewEvidence.parse(evidence);
  const images = new Map((options.images || []).map((image) => [image.id, image]));
  for (const item of items) {
    const image = images.get(item.id);
    if (image?.formatValidated && image.sha256 && item.imageSha256 === null)
      item.imageSha256 = image.sha256;
  }
  const reviewMap = new Map(reviews.map((review) => [review.itemId, review]));
  if (new Set(reviews.map((r) => r.itemId)).size !== reviews.length)
    throw new Error("Duplicate review evidence");
  const ids = new Set(items.map((i) => i.id));
  if (reviews.some((r) => !ids.has(r.itemId))) throw new Error("Review references an absent item");
  const records = items.map((item) => {
    const review = reviewMap.get(item.id),
      hash = contentHash(item);
    const bound =
      !!review &&
      review.itemSha256 === hash &&
      review.sourceSha256 === source.sha256 &&
      Date.parse(review.reviewedAt) <= now;
    const unique = review
      ? new Set(review.checks.map((c) => c.field)).size === review.checks.length
      : false;
    const checked = verificationFields.filter(
      (field) =>
        bound &&
        unique &&
        review!.checks.some(
          (c) =>
            c.field === field &&
            (c.verdict === "verified"
              ? present(item, field) &&
                (field !== "image" ||
                  (images.get(item.id)?.formatValidated === true &&
                    images.get(item.id)?.sha256 === item.imageSha256))
              : notApplicable(item, field)),
        ),
    );
    const manuallyVerified = checked.length === verificationFields.length;
    const patchVerified =
      manuallyVerified &&
      source.gameVersion !== null &&
      source.targetPatch !== null &&
      source.targetPatch.sourceRevision === source.revision &&
      review!.patchId === source.targetPatch.id;
    return {
      id: item.id,
      itemSha256: hash,
      sourceImported: true,
      schemaValidated: true,
      manuallyReviewed: bound && unique,
      manuallyVerified,
      patchVerified,
      verifiedFields: checked,
      imageFormatValidated: images.get(item.id)?.formatValidated === true,
      imageMatches: images.get(item.id)?.sha256 === item.imageSha256 && item.imageSha256 !== null,
      staleReview: !!review && !bound,
      missingFields: verificationFields.filter(
        (field) => !present(item, field) && !notApplicable(item, field),
      ),
    };
  });
  return {
    schemaVersion: 1,
    source: {
      id: source.id,
      url: sourceUrl(source),
      revision: source.revision,
      sha256: source.sha256,
      gameVersion: source.gameVersion,
      rights: source.rights,
      targetPatch: source.targetPatch,
    },
    normalizedSha256: contentHash(items),
    evidenceSha256: contentHash(reviews),
    items,
    records,
    coverage: {
      sourceImported: items.length,
      schemaValidated: items.length,
      excludedSourceRecords: Array.isArray(raw) ? raw.length - items.length : 0,
      imageFormatValidated: records.filter((i) => i.imageFormatValidated).length,
      manuallyReviewed: records.filter((i) => i.manuallyReviewed).length,
      manuallyVerified: records.filter((i) => i.manuallyVerified).length,
      patchVerified: records.filter((i) => i.patchVerified).length,
      staleReviews: records.filter((i) => i.staleReview).length,
      recipes: items.filter((i) => i.recipe !== null).length,
      abilities: items.filter((i) => i.abilities !== null).length,
      missingCategories: items.filter((i) => i.category === null).length,
    },
    scope:
      "Operator-attested review evidence, not automatic proof of current-game truth or legal permission. Download timestamps never confer verification.",
  };
}
export async function downloadSnapshot(source: SourceDefinition, fetcher: typeof fetch = fetch) {
  source = sourceDefinition.parse(source);
  readySource(source);
  const response = await fetcher(sourceUrl(source), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Pinned source unavailable");
  const max = 64 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new Error("Source exceeds64MiB");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty source response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Source exceeds64MiB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  if (byteHash(bytes) !== source.sha256) throw new Error("Source checksum mismatch");
  return bytes;
}

export type ImageCheck = {
  id: string;
  quality: 1;
  formatValidated: boolean;
  sha256: string | null;
};
export async function validateImages(
  items: VerificationItem[],
  fetcher: typeof fetch = fetch,
): Promise<ImageCheck[]> {
  const result: ImageCheck[] = [];
  for (const item of items.slice(0, 10)) {
    let checked: ImageCheck = { id: item.id, quality: 1, formatValidated: false, sha256: null };
    try {
      const response = await fetcher(itemIconUrl(item.id, 1, 96), {
        redirect: "manual",
        signal: AbortSignal.timeout(2500),
        headers: { Accept: "image/png" },
      });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/png"))
        throw new Error();
      const reader = response.body?.getReader();
      if (!reader) throw new Error();
      let size = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 200000) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (!validRendererPng(bytes)) throw new Error();
      checked = { ...checked, formatValidated: true, sha256: byteHash(bytes) };
    } catch {
      /* Artwork outages remain explicit unknowns, never a verification pass. */
    }
    result.push(checked);
  }
  return result;
}
