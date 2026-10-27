import { z } from "zod";
import { equipmentSlots, findEquipment } from "../albion/equipment-catalog";
const itemIdentifier = z
  .string()
  .regex(/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/)
  .max(100);
const sourceUrl = z
  .url()
  .startsWith("https://")
  .refine((value) => {
    const url = new URL(value);
    return !url.username && !url.password;
  }, "Source references must not contain credentials");
export const catalogItem = z
  .object({
    id: itemIdentifier,
    name: z.string().trim().min(1).max(120),
    slot: z.enum(equipmentSlots),
    tier: z.number().int().min(1).max(8),
    enchantment: z.number().int().min(0).max(4),
    itemPower: z.number().int().nonnegative().max(5000).nullable(),
    abilities: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(100),
          name: z.string().trim().min(1).max(100),
          slot: z.string().trim().min(1).max(30),
          unlock: z.string().max(200).nullable(),
          sourceUrl,
        }),
      )
      .max(100),
    recipe: z
      .object({
        outputCount: z.number().int().positive().max(1000000),
        materials: z
          .array(
            z.object({
              id: itemIdentifier,
              quantity: z.number().int().positive().max(1000000),
              returnable: z.boolean(),
            }),
          )
          .min(1)
          .max(30),
      })
      .nullable(),
  })
  .superRefine((v, c) => {
    const known = findEquipment(v.id);
    if (known && known.family.slot !== v.slot)
      c.addIssue({
        code: "custom",
        message: "Known equipment does not belong to the declared slot",
      });
    const m = /^T([1-8])_.+?(?:@([1-4]))?$/.exec(v.id);
    if (Number(m?.[1]) !== v.tier || Number(m?.[2] || 0) !== v.enchantment)
      c.addIssue({ code: "custom", message: "Identifier and tier/enchantment disagree" });
    const abilities = v.abilities.map((a) => `${a.slot}\u0000${a.id}`);
    if (new Set(abilities).size !== abilities.length)
      c.addIssue({ code: "custom", message: "Duplicate ability in the same selection slot" });
    if (v.recipe) {
      const materials = v.recipe.materials.map((material) => material.id);
      if (new Set(materials).size !== materials.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate recipe ingredients must be consolidated",
        });
      if (materials.includes(v.id))
        c.addIssue({ code: "custom", message: "A recipe cannot consume its own output" });
    }
  });
export const catalogBundle = z
  .object({
    version: z.string().regex(/^[a-zA-Z0-9._-]{1,80}$/),
    sourceUrl,
    rightsReference: z.string().trim().min(20).max(2000),
    items: z.array(catalogItem).min(1).max(50000),
  })
  .superRefine((v, c) => {
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      c.addIssue({ code: "custom", message: "Duplicate item identifiers" });
  });
