import { z } from "zod";
export const productionCities = [
  "Bridgewatch",
  "Martlock",
  "Lymhurst",
  "Fort Sterling",
  "Thetford",
] as const;
export const mechanicsProfile = z.object({
  version: z.literal("wiki-84429"),
  city: z.enum(productionCities),
  dailyBonus: z.union([z.literal(0), z.literal(10), z.literal(20)]),
  refiningLevels: z.array(z.number().int().min(0).max(100)).length(5),
});
export type MechanicsProfile = z.infer<typeof mechanicsProfile>;
export const returnProfileSource =
  "https://wiki.albiononline.com/index.php?title=Resource_return_rate&oldid=84429";
export const refiningSpecSource = "https://wiki.albiononline.com/wiki/Specializations#Refining";
const craftCities: Record<string, string> = {
  MAIN_AXE: "Martlock",
  MAIN_SWORD: "Lymhurst",
  "2H_BOW": "Lymhurst",
  OFF_SHIELD: "Martlock",
  HEAD_CLOTH_SET1: "Thetford",
  ARMOR_LEATHER_SET1: "Thetford",
  SHOES_LEATHER_SET1: "Lymhurst",
};
const refineCities: Record<string, string> = {
  METALBAR: "Thetford",
  PLANKS: "Fort Sterling",
  CLOTH: "Lymhurst",
  LEATHER: "Martlock",
  STONEBLOCK: "Bridgewatch",
};
/** Historical source profile; no claim of current-patch certification or event detection. */
export function sourcedReturnRates(
  kind: "crafting" | "refining",
  output: string,
  city: string,
  dailyBonus = 0,
) {
  if (
    !productionCities.includes(city as (typeof productionCities)[number]) ||
    ![0, 10, 20].includes(dailyBonus)
  )
    throw Error("Choose a supported city and supplied daily bonus");
  const code = /^T[4-8]_(.+)$/.exec(output)?.[1];
  if (!code) throw Error("Profile does not cover this item");
  const cities = kind === "refining" ? refineCities : craftCities;
  if (kind === "refining" && !cities[code])
    throw Error("Profile does not cover this refined resource");
  if (kind === "crafting" && !cities[code] && !["BAG", "CAPE"].includes(code))
    throw Error("Profile does not cover this crafting family");
  const bonus = 18 + (cities[code] === city ? (kind === "refining" ? 40 : 15) : 0) + dailyBonus;
  return {
    bonus,
    returnRate: (100 * bonus) / (100 + bonus),
    focusReturnRate: (100 * (bonus + 59)) / (159 + bonus),
  };
}
/** Five T4–T8 nodes: 30 shared FCE per level, plus 250 per level of the selected tier. */
export function refiningEfficiency(tier: number, levels: number[]) {
  if (
    !Number.isInteger(tier) ||
    tier < 4 ||
    tier > 8 ||
    levels.length !== 5 ||
    levels.some((v) => !Number.isInteger(v) || v < 0 || v > 100)
  )
    throw Error("Enter five T4–T8 specialization levels from 0 to 100");
  return 30 * levels.reduce((a, b) => a + b, 0) + 250 * levels[tier - 4];
}
