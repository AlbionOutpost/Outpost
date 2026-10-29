import { equipmentSets } from "../albion/equipment-sets";
import { createLibraryBuildDraft } from "../grind-build-draft";
import { activityName, type LibraryBuild } from "../grind-library-types";
import { compositionInput, memberSlot, roles, type CompositionInput } from "./validation";
import type { Region } from "../albion/region-config";

type SourceEquipment = {
  slot: string;
  itemId: string;
  quality: number;
  abilitySelections: unknown;
  alternativeItemIds: unknown;
  abilities?: string;
  alternatives?: string;
};
export type SourceBuildLoadout = {
  id: string;
  title: string;
  description?: string;
  strategy?: string;
  contentType: string;
  equipmentSets: unknown;
  equipment: SourceEquipment[];
};
export type CopiedBuildLoadout = {
  sourceBuildId: string | null;
  title: string;
  contentType: string;
  equipment: CompositionInput["slots"][number]["equipment"];
  equipmentSets: CompositionInput["slots"][number]["equipmentSets"];
  notes: string;
  compositionNotes: string;
  notice: string;
};
const unsupported =
  "This build contains equipment, abilities or alternatives that cannot be copied safely. Review the loadout in the build editor first.";
function bounded(
  text: string,
  limit: number,
  notices: string[],
  message = "Author notes were shortened to fit composition limits. The original build remains unchanged.",
) {
  if (text.length <= limit) return text;
  notices.push(message);
  return text.slice(0, limit);
}
function authorNotes(build: SourceBuildLoadout) {
  return build.equipment
    .flatMap((row) => [
      row.abilities ? `${row.slot} author ability notes: ${row.abilities}` : "",
      row.alternatives ? `${row.slot} author alternative notes: ${row.alternatives}` : "",
    ])
    .filter(Boolean)
    .join("\n");
}
export function copyBuildLoadout(
  build: SourceBuildLoadout,
  options: {
    sourceBuildId?: string | null;
    notes?: string;
    notice?: string;
    idFactory?: () => string;
  } = {},
): CopiedBuildLoadout {
  const notices: string[] = [],
    idFactory = options.idFactory ?? (() => crypto.randomUUID());
  try {
    const equipment = memberSlot.shape.equipment.parse(
      build.equipment.map((row) => ({
        slot: row.slot,
        itemId: row.itemId,
        quality: row.quality,
        abilities: row.abilitySelections,
        alternatives: row.alternativeItemIds,
      })),
    );
    if (!equipment.some((row) => row.slot === "Main hand")) throw new Error(unsupported);
    const sets = equipmentSets
      .parse(build.equipmentSets)
      .map((set) => ({ ...set, id: idFactory() }));
    const unvalidated = [authorNotes(build), options.notes || ""].filter(Boolean).join("\n\n");
    const notes = bounded(unvalidated, 2000, notices);
    const compositionNotes = bounded(
      [build.description, build.strategy, unvalidated].filter(Boolean).join("\n\n"),
      12000,
      notices,
    );
    return {
      sourceBuildId: options.sourceBuildId === undefined ? build.id : options.sourceBuildId,
      title: build.title,
      contentType: build.contentType,
      equipment,
      equipmentSets: equipmentSets.parse(sets),
      notes,
      compositionNotes,
      notice: [options.notice, ...new Set(notices)].filter(Boolean).join(" "),
    };
  } catch {
    throw new Error(unsupported);
  }
}
export function copyLibraryLoadout(
  build: LibraryBuild,
  names: Record<string, string>,
  idFactory?: () => string,
): CopiedBuildLoadout {
  const draft = createLibraryBuildDraft(build, names);
  if (!draft) throw new Error(unsupported);
  if (
    build.equipment.length !== draft.equipment.length ||
    build.equipment.some(
      (row) =>
        !draft.equipment.some(
          (candidate) => candidate.slot === row.slot && candidate.itemId === row.itemId,
        ),
    )
  )
    throw new Error(unsupported);
  const alternateSets = build.equipment.flatMap((row) =>
    Object.entries(row.alternativeSkills || {}).filter(([, skills]) => skills.length),
  );
  if (alternateSets.length > 5 || draft.equipmentSets.length !== alternateSets.length)
    throw new Error(
      "This build has alternate ability sets that cannot all be copied. Review its spare sets in the build editor first.",
    );
  const copied = copyBuildLoadout(
    {
      ...draft,
      id: build.id,
      equipment: draft.equipment.map((row) => ({
        ...row,
        alternativeItemIds: build.equipment.find((source) => source.slot === row.slot)!
          .alternatives,
      })),
    },
    {
      sourceBuildId: null,
      idFactory,
      notes: build.equipment
        .flatMap((row) => [
          row.skills.length
            ? `${row.slot} recorded abilities: ${row.skills.map((id) => names[id] || id).join(", ")}`
            : "",
          ...Object.entries(row.alternativeSkills || {}).map(
            ([item, skills]) =>
              `${row.slot} alternative ${item}: ${skills.map((id) => names[id] || id).join(", ")}`,
          ),
        ])
        .filter(Boolean)
        .join("\n"),
      notice:
        "Library quality was not recorded. Normal quality remains an editable planning assumption.",
    },
  );
  return { ...copied, title: build.title, contentType: activityName(build.category) || "Other" };
}
export function compositionFromLoadout(
  loadout: CopiedBuildLoadout,
  region: Region,
  role: (typeof roles)[number] = "Custom",
  idFactory: () => string = () => crypto.randomUUID(),
): { initial: CompositionInput; notice: string } {
  const notices: string[] = loadout.notice ? [loadout.notice] : [];
  const title = bounded(
    `${loadout.title} comp`,
    100,
    notices,
    "The composition title was shortened to fit its limit.",
  );
  const initial = compositionInput.parse({
    title,
    description: "",
    region,
    contentType: loadout.contentType,
    visibility: "PRIVATE",
    groupId: null,
    notes: loadout.compositionNotes,
    slots: [
      {
        id: idFactory(),
        playerName: "",
        role,
        customRole: role === "Custom" ? "Unassigned" : "",
        mandatory: true,
        substitute: "",
        notes: loadout.notes,
        sourceBuildId: loadout.sourceBuildId,
        equipment: loadout.equipment,
        equipmentSets: loadout.equipmentSets,
      },
    ],
  });
  return {
    initial,
    notice: [
      "An independent private composition draft is ready. Your original build is unchanged.",
      role === "Custom" ? "Choose a role for the unassigned member." : "",
      ...new Set(notices),
    ]
      .filter(Boolean)
      .join(" "),
  };
}
