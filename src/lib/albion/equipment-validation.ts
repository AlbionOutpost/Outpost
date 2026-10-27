import { z } from "zod";
import { findEquipment, equipmentSlots } from "./equipment-catalog";
export const equipmentChoice = z
  .object({
    slot: z.enum(equipmentSlots),
    itemId: z.string().max(100),
    quality: z.number().int().min(1).max(5),
    abilities: z.record(z.string().max(20), z.string().max(100)),
    alternatives: z.array(z.string().max(100)).max(4),
  })
  .superRefine((e, ctx) => {
    const found = findEquipment(e.itemId);
    if (!found || found.family.slot !== e.slot) {
      ctx.addIssue({ code: "custom", message: "Select supported equipment for this slot" });
      return;
    }
    for (const [slot, ability] of Object.entries(e.abilities))
      if (!found.family.abilities[slot]?.includes(ability))
        ctx.addIssue({
          code: "custom",
          message: "Ability does not belong to the selected equipment",
        });
    for (const alternative of e.alternatives)
      if (findEquipment(alternative)?.family.slot !== e.slot)
        ctx.addIssue({ code: "custom", message: "Alternative equipment must use the same slot" });
  });
