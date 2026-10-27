import { z } from "zod";
import { regionSchema } from "../albion/region-config";
import { equipmentChoice } from "../albion/equipment-validation";
export const roles = [
  "Tank",
  "Healer",
  "Melee DPS",
  "Ranged DPS",
  "Support",
  "Defensive support",
  "Engage",
  "Pierce",
  "Caller",
  "Scout",
  "Custom",
] as const;
export { equipmentChoice } from "../albion/equipment-validation";
export const memberSlot = z.object({
  id: z.string().uuid(),
  playerName: z.string().trim().max(60),
  role: z.enum(roles),
  customRole: z.string().trim().max(60),
  mandatory: z.boolean(),
  substitute: z.string().trim().max(60),
  notes: z.string().trim().max(2000),
  sourceBuildId: z.string().max(100).nullable(),
  equipment: z
    .array(equipmentChoice)
    .max(10)
    .refine(
      (es) => new Set(es.map((e) => e.slot)).size === es.length,
      "Equipment slots must be unique",
    ),
});
export const compositionInput = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(4000),
    region: regionSchema,
    contentType: z.string().trim().min(1).max(80),
    visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]),
    groupId: z.string().max(100).nullable(),
    notes: z.string().trim().max(12000),
    slots: z
      .array(memberSlot)
      .min(1)
      .max(100)
      .refine((ss) => new Set(ss.map((s) => s.id)).size === ss.length, "Member IDs must be unique"),
  })
  .refine(
    (c) => (c.visibility === "GROUP" ? !!c.groupId : c.groupId === null),
    "Group visibility requires a group; other visibility must not carry a group",
  );
export type EquipmentChoice = z.infer<typeof equipmentChoice>;
export type CompositionInput = z.infer<typeof compositionInput>;
export type MemberSlot = z.infer<typeof memberSlot>;
