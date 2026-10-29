import type { ReactNode } from "react";
import { equipmentName, findEquipment } from "@/lib/albion/equipment-catalog";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import {
  BuildDetailWorkspace,
  type BuildDetailInformation,
  type PresentedBuildEquipment,
} from "./build-detail-workspace";
type Gear = {
  slot: string;
  itemId: string;
  quality: number;
  abilities: string;
  alternatives: string;
  abilitySelections: unknown;
  alternativeItemIds: string[];
  recordedSkills?: { id: string; name: string }[];
  alternativeRecordedSkills?: Record<string, { id: string; name: string }[]>;
};
export function BuildLoadoutView({
  equipment,
  region,
  information,
  recommendations,
  qualityAssumed = false,
  extraActions,
}: {
  equipment: Gear[];
  region?: string;
  information?: BuildDetailInformation;
  recommendations?: ReactNode;
  qualityAssumed?: boolean;
  extraActions?: ReactNode;
}) {
  const qualityNames = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
  function spells(item: Gear) {
    const options = archivedSpellOptions(item.itemId);
    if (item.recordedSkills?.length)
      return item.recordedSkills.map((spell) => ({
        ...spell,
        key: options.find((option) => option.id === spell.id)?.key || "Ability",
      }));
    return item.abilitySelections &&
      typeof item.abilitySelections === "object" &&
      !Array.isArray(item.abilitySelections)
      ? Object.entries(item.abilitySelections).flatMap(([key, name]) =>
          typeof name === "string" && name
            ? [
                {
                  key,
                  name,
                  id: options.find((option) => option.key === key && option.name === name)?.id,
                },
              ]
            : [],
        )
      : [];
  }
  const projected: PresentedBuildEquipment[] = equipment
    .filter((item) => item.itemId)
    .map((item) => {
      const found = findEquipment(item.itemId);
      return {
        slot: item.slot,
        itemId: item.itemId,
        quality: item.quality,
        name: equipmentName(item.itemId),
        tierLabel: found ? `T${found.tier}.${found.enchantment}` : undefined,
        qualityLabel: qualityAssumed
          ? `${qualityNames[item.quality - 1] || "Normal"} (planning quality)`
          : qualityNames[item.quality - 1] || "Quality not specified",
        spells: spells(item),
        abilityNotes: item.abilities,
        alternativeNotes: item.alternatives,
        alternativeItemId: item.alternativeItemIds[0],
        alternateItems: item.alternativeItemIds.map((id) => ({
          id,
          name: equipmentName(id),
          spells: item.alternativeRecordedSkills?.[id] || [],
        })),
      };
    });
  return (
    <BuildDetailWorkspace
      equipment={projected}
      region={region}
      information={information}
      recommendations={recommendations}
      extraActions={extraActions}
    />
  );
}
