import { compositionInput, type CompositionInput } from "./validation";
import { copyLibraryLoadout } from "./build-loadout";
import type { LibraryBuild, LibraryComposition } from "../grind-library-types";
import { activityName } from "../grind-library-types";
import type { Region } from "../albion/region-config";

/** Atomic copy: every recorded member position and optional flag survives, or no
 * editable draft is produced. Public readonly presentation can still show gaps.
 */
export function copyLibraryGroup(
  composition: LibraryComposition,
  builds: readonly LibraryBuild[],
  names: Record<string, string>,
  region: Region,
  idFactory = () => crypto.randomUUID(),
): { initial: CompositionInput; notice: string } {
  if (!composition.members.length || composition.members.length > 100)
    throw new Error("This group build exceeds the supported 1–100 member composition size.");
  const lookup = new Map(builds.map((build) => [build.id, build]));
  const notices = new Set<string>();
  const slots = composition.members.map((id) => {
    const build = lookup.get(id);
    if (!build)
      throw new Error("A member loadout is unavailable. No partial group build was copied.");
    const copied = copyLibraryLoadout(build, names, idFactory);
    if (copied.notice) notices.add(copied.notice);
    return {
      id: idFactory(),
      playerName: "",
      role: "Custom" as const,
      customRole: "Unassigned",
      mandatory: !composition.optional.includes(id),
      substitute: "",
      notes: copied.notes,
      sourceBuildId: null,
      equipment: copied.equipment,
      equipmentSets: copied.equipmentSets,
    };
  });
  const parsed = compositionInput.safeParse({
    title: composition.title,
    description: composition.description,
    region,
    contentType: activityName(composition.category),
    visibility: "PRIVATE",
    groupId: null,
    notes: "",
    slots,
  });
  if (!parsed.success)
    throw new Error(
      "This group build does not fit the composition limits. Its original loadouts remain available; no partial draft was created.",
    );
  if (new TextEncoder().encode(JSON.stringify(parsed.data)).byteLength > 65536)
    throw new Error(
      "This complete group build exceeds the 64KB composition save limit. No partial draft was created; use its individual loadouts to plan a smaller party.",
    );
  return {
    initial: parsed.data,
    notice: [
      "An independent private composition is ready. Assign roles and players before saving.",
      ...notices,
    ].join(" "),
  };
}
