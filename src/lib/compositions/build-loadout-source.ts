import "server-only";
import { db } from "../db";
import { HttpError } from "../http-error";
import { findLibraryBuild, librarySpellNames } from "../grind-library";
import { copyBuildLoadout, copyLibraryLoadout } from "./build-loadout";
import { buildCompositionLaunch, type BuildCompositionLaunch } from "./build-launch";
export async function resolveBuildLoadout(id: string, userId: string) {
  if (!userId) throw new HttpError(401, "Sign in to attach a build");
  if (!/^[A-Za-z0-9-]{1,100}$/.test(id)) throw new HttpError(400, "Select a build");
  const build = await db.build.findUnique({ where: { id }, include: { equipment: true } });
  if (!build || ((build.visibility === "PRIVATE" || build.hiddenAt) && build.authorId !== userId))
    throw new HttpError(404, "Build not found");
  try {
    return copyBuildLoadout(build);
  } catch (error) {
    throw new HttpError(
      422,
      error instanceof Error ? error.message : "This loadout cannot be copied safely.",
    );
  }
}
export async function resolveCompositionSource(input: BuildCompositionLaunch, userId: string) {
  if (!userId) throw new HttpError(401, "Sign in to plan a composition");
  const source = buildCompositionLaunch.parse(input);
  if (source.fromBuild) return resolveBuildLoadout(source.fromBuild, userId);
  if (source.fromLibrary) {
    const build = await findLibraryBuild(source.fromLibrary);
    if (!build) throw new HttpError(404, "Build not found");
    try {
      return copyLibraryLoadout(build, await librarySpellNames());
    } catch (error) {
      throw new HttpError(
        422,
        error instanceof Error ? error.message : "This loadout cannot be copied safely.",
      );
    }
  }
  return null;
}
