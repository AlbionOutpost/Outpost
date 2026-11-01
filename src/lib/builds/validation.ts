import { equipmentSets } from "../albion/equipment-sets";
import { equipmentChoice, validHandCombination } from "../albion/equipment-validation";
import { z } from "zod";
import { regionSchema } from "../albion/region-config";
export const slots = [
  "Main hand",
  "Off hand",
  "Helmet",
  "Chest",
  "Boots",
  "Cape",
  "Bag",
  "Mount",
  "Food",
  "Potion",
] as const;
export const contentTypes = [
  "Solo Mists",
  "Duo Mists",
  "Corrupted Dungeons",
  "Open World",
  "Solo PvE",
  "Group PvE",
  "Group Dungeons",
  "Avalonian Dungeons",
  "Ganking",
  "Small Scale PvP",
  "Hellgates",
  "Arena",
  "Crystal Arena",
  "ZvZ",
  "Roaming",
  "Faction Warfare",
  "Gathering",
  "Other",
] as const;
export const buildInput = z
  .object({
    equipmentSets,
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(4000),
    contentType: z.enum(contentTypes),
    region: regionSchema,
    visibility: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]),
    playerCount: z.number().int().min(1).max(400),
    recommendedIP: z.number().int().min(0).max(4000),
    strategy: z.string().trim().max(12000),
    patchNotes: z.string().trim().max(2000),
    equipment: z
      .array(
        z.object({
          slot: z.enum(slots),
          itemId: z.string().regex(/^[A-Z0-9_@]{3,100}$/),
          quality: z.number().int().min(1).max(5),
          abilities: z.string().trim().max(1000),
          alternatives: z.string().trim().max(1000),
          abilitySelections: z.record(z.string().max(20), z.string().max(100)).default({}),
          alternativeItemIds: z.array(z.string().max(100)).max(4).default([]),
        }),
      )
      .superRefine((rows, ctx) => {
        for (const row of rows)
          if (Object.keys(row.abilitySelections).length || row.alternativeItemIds.length) {
            const parsed = equipmentChoice.safeParse({
              slot: row.slot,
              itemId: row.itemId,
              quality: row.quality,
              abilities: row.abilitySelections,
              alternatives: row.alternativeItemIds,
            });
            if (!parsed.success)
              ctx.addIssue({
                code: "custom",
                message: "Validated abilities/alternatives must belong to supported equipment",
              });
          }
      })
      .min(1)
      .max(10)
      .refine(validHandCombination, "A two-handed weapon cannot be used with an off hand")
      .refine(
        (rows) => new Set(rows.map((r) => r.slot)).size === rows.length,
        "Equipment slots must be unique",
      ),
  })
  .refine((v) => v.equipment.some((e) => e.slot === "Main hand"), "Main hand is required");
export type BuildInput = z.infer<typeof buildInput>;
export function canReadBuild(visibility: string, authorId: string, userId?: string) {
  return visibility !== "PRIVATE" || authorId === userId;
}
