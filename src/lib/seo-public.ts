import "server-only";
import type { Metadata } from "next";
import { db } from "./db";
import { findLibraryBuild, findLibraryComposition, findLibraryGuide } from "./grind-library";
import { activityName } from "./grind-library-types";
import { privateMetadata, publicMetadata, seoText, type SeoQuery } from "./seo";

/** Metadata never borrows the viewer's permissions. No cookies, sessions or shared private cache. */
export async function authoredShareMetadata(
  kind: "build" | "composition",
  id: string,
  query: SeoQuery = {},
): Promise<Metadata> {
  const unavailable = () => privateMetadata(kind === "build" ? "Build" : "Composition");
  if (!id || id.length > 150 || /[\u0000-\u001f/]/.test(id)) return unavailable();
  if (kind === "build") {
    const record = await db.build.findFirst({
      where: { id, visibility: "PUBLIC", hiddenAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        contentType: true,
        visibility: true,
        hiddenAt: true,
      },
    });
    // Re-check the DTO as well: a transport/adapter mistake must not expose restricted fields.
    if (!record || record.visibility !== "PUBLIC" || record.hiddenAt !== null) return unavailable();
    return publicMetadata(
      record.title,
      record.description ||
        `${record.contentType} equipment build for Albion Online. Inspect the public loadout, abilities and planning notes.`,
      `/builds/${encodeURIComponent(record.id)}`,
      query,
    );
  }
  const record = await db.composition.findFirst({
    where: { id, visibility: "PUBLIC", hiddenAt: null, groupId: null },
    select: {
      id: true,
      title: true,
      description: true,
      contentType: true,
      visibility: true,
      hiddenAt: true,
      groupId: true,
    },
  });
  if (
    !record ||
    record.visibility !== "PUBLIC" ||
    record.hiddenAt !== null ||
    record.groupId !== null
  )
    return unavailable();
  return publicMetadata(
    record.title,
    record.description ||
      `${record.contentType} party composition for Albion Online. Inspect public roles and loadouts.`,
    `/compositions/${encodeURIComponent(record.id)}`,
    query,
  );
}

/** These resolvers read only the existing immutable PUBLIC archive, never account drafts. */
export async function archiveShareMetadata(
  kind: "build" | "composition" | "guide",
  slug: string,
  query: SeoQuery = {},
): Promise<Metadata> {
  if (kind === "build") {
    const build = await findLibraryBuild(slug);
    if (!build) return privateMetadata("Build not found");
    return publicMetadata(
      build.title,
      seoText(build.description) ||
        `${build.weaponName || "Equipment"} build for ${activityName(build.category)} in Albion Online. Inspect the archived equipment, skills and alternatives.`,
      `/builds/library/${encodeURIComponent(build.slug)}`,
      query,
    );
  }
  if (kind === "composition") {
    const composition = await findLibraryComposition(slug);
    if (!composition) return privateMetadata("Composition not found");
    return publicMetadata(
      composition.title,
      `${activityName(composition.category)} group build with ${composition.members.length} recorded member loadouts. Inspect equipment and roles in the Albion Online archive.`,
      `/compositions/library/${encodeURIComponent(composition.slug)}`,
      query,
    );
  }
  const guide = await findLibraryGuide(slug);
  if (!guide) return privateMetadata("Guide not found");
  return publicMetadata(
    guide.seoTitle ?? guide.title,
    guide.summary,
    `/guides/${encodeURIComponent(guide.slug)}`,
    query,
    true,
  );
}

export async function itemShareMetadata(
  encodedId: string,
  query: SeoQuery = {},
): Promise<Metadata> {
  let id: string;
  try {
    id = decodeURIComponent(encodedId);
  } catch {
    return privateMetadata("Item not found");
  }
  if (!id || id.length > 150) return privateMetadata("Item not found");
  const item = await db.itemMetadata.findFirst({
    where: { id, active: true },
    select: { id: true, name: true, active: true },
  });
  if (!item || !item.active || item.id !== id) return privateMetadata("Item not found");
  return publicMetadata(
    `${item.name} — Albion Online item`,
    `Inspect ${item.name} in the available Albion Online item catalog, with sourced equipment details and regional market observations.`,
    `/items/${encodeURIComponent(item.id)}`,
    query,
  );
}
