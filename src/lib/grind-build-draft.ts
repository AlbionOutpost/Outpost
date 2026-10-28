import { randomUUID } from "node:crypto";
import { buildInput, contentTypes, type BuildInput } from "./builds/validation";
import { equipmentSet, type EquipmentSet } from "./albion/equipment-sets";
import { archivedSpellOptions } from "./albion/equipment-abilities";
import { equipmentName, findEquipment } from "./albion/equipment-catalog";
import { activityName, type LibraryBuild } from "./grind-library-types";

function recordedSelections(itemId: string, ids: string[]) {
  const options = archivedSpellOptions(itemId);
  const groups = new Map<string, Set<string>>();
  for (const id of ids) {
    const option = options.find((s) => s.id === id);
    if (option) groups.set(option.key, new Set([...(groups.get(option.key) || []), option.name]));
  }
  const selections = Object.fromEntries(
    [...groups].flatMap(([key, names]) => (names.size === 1 ? [[key, [...names][0]]] : [])),
  );
  const unresolved = ids.filter((id) => {
    const option = options.find((s) => s.id === id);
    return !option || !Object.hasOwn(selections, option.key);
  });
  return { selections, unresolved };
}

/** Validated independent copies. Recorded alternative spell choices become ordinary saved spare sets. */
export function createLibraryBuildDraft(
  build: LibraryBuild,
  names: Record<string, string>,
): BuildInput | null {
  const equipment = build.equipment.map((row) => {
    const { selections, unresolved } = recordedSelections(row.itemId, row.skills);
    const known = findEquipment(row.itemId)?.family.slot === row.slot;
    return {
      slot: row.slot,
      itemId: row.itemId,
      quality: 1,
      abilities: unresolved
        .map((id) => names[id] || id)
        .join(", ")
        .slice(0, 1000),
      alternatives: known ? "" : row.alternatives.join(", "),
      abilitySelections: known ? selections : {},
      alternativeItemIds: known
        ? row.alternatives
            .filter((id) => findEquipment(id)?.family.slot === row.slot && id !== row.itemId)
            .slice(0, 4)
        : [],
    };
  });
  const main = equipment.find((row) => row.slot === "Main hand");
  const filtered =
    main && findEquipment(main.itemId)?.family.twoHanded
      ? equipment.filter((row) => row.slot !== "Off hand")
      : equipment;
  const sets: EquipmentSet[] = [];
  const supportedBase = filtered.every(
    (row) => findEquipment(row.itemId)?.family.slot === row.slot,
  );
  const alternativeNotes: string[] = [];
  for (const source of build.equipment)
    for (const [itemId, ids] of Object.entries(source.alternativeSkills || {})) {
      if (!ids.length) continue;
      alternativeNotes.push(
        `${source.slot} alternative (${equipmentName(itemId)}): ${ids.map((id) => names[id] || id).join(", ")}`,
      );
      if (
        !supportedBase ||
        sets.length === 5 ||
        !filtered.some((row) => row.slot === source.slot) ||
        findEquipment(itemId)?.family.slot !== source.slot
      )
        continue;
      const { selections } = recordedSelections(itemId, ids);
      const parsed = equipmentSet.safeParse({
        id: randomUUID(),
        name: `${source.slot} swap · ${equipmentName(itemId)}`.slice(0, 60),
        equipment: filtered.map((row) => ({
          slot: row.slot,
          itemId: row.slot === source.slot ? itemId : row.itemId,
          quality: row.quality,
          abilities: row.slot === source.slot ? selections : row.abilitySelections,
          alternatives:
            row.slot === source.slot
              ? [row.itemId, ...row.alternativeItemIds].filter((id) => id !== itemId).slice(0, 4)
              : row.alternativeItemIds,
        })),
      });
      if (parsed.success) sets.push(parsed.data);
    }
  const supplement = [
    ...(build.tags.length ? [`Archived author tags: ${build.tags.join(", ")}`] : []),
    ...(build.recommendedTraits.length
      ? [`Archived awakening recommendations: ${build.recommendedTraits.join(", ")}`]
      : []),
    ...alternativeNotes,
    ...build.videos.map((video) => `Recorded YouTube ${video.kind}: ${video.url}`),
  ]
    .join("\n")
    .slice(0, 4000);
  const suffix = supplement ? `\n\n${supplement}` : "";
  const activity = activityName(build.category);
  const candidate = {
    equipmentSets: sets,
    title: `${build.title} (copy)`.slice(0, 100),
    description: `Adapted from ${build.author}'s Albion Online Grind build; archived 27 October 2026.`,
    contentType: contentTypes.includes(activity as (typeof contentTypes)[number])
      ? activity
      : "Other",
    region: "europe",
    visibility: "PRIVATE",
    playerCount: 1,
    recommendedIP: 0,
    strategy: build.description.slice(0, 12000 - suffix.length) + suffix,
    patchNotes:
      "Historical equipment and recorded selections. Confirm current patch and character unlocks. Quality was not captured; Normal is an editable planning assumption. Supported alternative spell choices become separate spare sets; all recorded alternatives remain notes. Full author text stays in the archive if editor limits shorten this copy.",
    equipment: filtered,
  };
  const parsed = buildInput.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
