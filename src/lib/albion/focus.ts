import masteryData from "./game/mastery.json" with { type: "json" };
type Bonus = {
  efficiencyPerLevel: number;
  minTier: number;
  maxTier: number;
  itemPatterns: string[];
};
type SpecBonus = { categoryId: string; specId: string; bonuses: Bonus[] };
type Category = {
  id: string;
  name: string;
  description: string;
  itemId: string;
  specs: { id: string; name: string; itemId: string; sortOrder: number }[];
};
export const masteryGroups = masteryData.groups as Record<
  string,
  { label: string; categoryIds: string[] }
>;
export const masteryCategories = masteryData.categories as Category[];
const compiled = (masteryData.efficiency as SpecBonus[]).map((spec) => ({
  ...spec,
  bonuses: spec.bonuses.map((b) => ({
    ...b,
    patterns: b.itemPatterns.map(
      (p) =>
        new RegExp(
          `^${p
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\?/g, ".")
            .replace(/\*/g, ".*")}$`,
        ),
    ),
  })),
}));
/** spec id → level (0–100). */
export type MasteryLevels = Record<string, number>;
function baseId(itemId: string) {
  return itemId.toUpperCase().replace(/@\d+$/, "");
}
/** Specs whose levels change focus cost for this item, with their per-level efficiency. */
export function focusSpecsFor(itemId: string) {
  const id = baseId(itemId);
  const tier = Number(/^T(\d)_/.exec(id)?.[1] ?? 0);
  return compiled
    .map((spec) => ({
      categoryId: spec.categoryId,
      specId: spec.specId,
      perLevel: spec.bonuses.reduce(
        (sum, b) =>
          tier >= b.minTier && tier <= b.maxTier && b.patterns.some((p) => p.test(id))
            ? sum + b.efficiencyPerLevel
            : sum,
        0,
      ),
    }))
    .filter((s) => s.perLevel > 0);
}
/** Focus cost efficiency: Σ level × efficiency per level over matching specs. */
export function focusEfficiency(itemId: string, levels: MasteryLevels) {
  let total = 0;
  for (const spec of focusSpecsFor(itemId)) {
    const level = levels[spec.specId] ?? 0;
    if (!Number.isInteger(level) || level < 0 || level > 100)
      throw Error("Specialization levels are whole numbers from 0 to 100");
    total += level * spec.perLevel;
  }
  return total;
}
/** Focus per craft = base / 2^(efficiency / 10000). Fractional; the game rounds at the station. */
export function focusPerCraft(baseFocus: number, efficiency: number) {
  if (
    !Number.isFinite(baseFocus) ||
    baseFocus < 0 ||
    !Number.isFinite(efficiency) ||
    efficiency < 0
  )
    throw Error("Invalid focus inputs");
  return baseFocus / 2 ** (efficiency / 10000);
}
