import gameRecipesData from "./recipes.json" with { type: "json" };
import itemsData from "./items.json" with { type: "json" };
import type { Recipe } from "../recipes";
type GameRecipe = {
  id: string;
  output: string;
  kind: "crafting" | "refining";
  category?: "cooking" | "alchemy";
  craftingCategory: string | null;
  tier: number;
  enchantment: number;
  outputCount: number;
  focus: number;
  silver: number;
  ingredients: { id: string; count: number; returnable?: false }[];
};
type ItemRow = [name: string, weight: number | null, value: number | null];
const items = itemsData as unknown as Record<string, ItemRow>;
const raw = gameRecipesData as unknown as GameRecipe[];
export const gameDataSource = "Game item data, captured 27 Oct 2026";
const byId = new Map(raw.map((r) => [r.id, r]));
const byOutput = new Map<string, GameRecipe[]>();
for (const r of raw) byOutput.set(r.output, [...(byOutput.get(r.output) ?? []), r]);
export function itemName(id: string) {
  return items[id]?.[0] ?? items[id.split("@")[0]]?.[0] ?? id;
}
export function itemWeight(id: string): number | null {
  return items[id]?.[1] ?? items[id.split("@")[0]]?.[1] ?? null;
}
export function itemValue(id: string): number | null {
  return items[id]?.[2] ?? items[id.split("@")[0]]?.[2] ?? null;
}
function alternativeIndex(id: string) {
  const match = /~(\d+)$/.exec(id);
  return match ? Number(match[1]) : 1;
}
function toRecipe(r: GameRecipe): Recipe {
  const enchant = r.enchantment ? `.${r.enchantment}` : ".0";
  const alternative = alternativeIndex(r.id);
  return {
    id: r.id,
    name: `${itemName(r.output).replace(/ \(T\d\.\d\)$/, "")} · T${r.tier}${enchant}${alternative > 1 ? ` (alt ${alternative})` : ""}`,
    kind: r.kind,
    output: r.output,
    outputCount: r.outputCount,
    baseFocus: r.focus || undefined,
    ...(r.category ? { category: r.category } : {}),
    tier: r.tier,
    enchantment: r.enchantment,
    craftingCategory: r.craftingCategory ?? undefined,
    silver: r.silver || undefined,
    alternative,
    ingredients: r.ingredients.map((i) => ({
      id: i.id,
      name: itemName(i.id),
      quantity: i.count,
      quality: "normal" as const,
      ...(i.returnable === false ? { returnable: false } : {}),
    })),
    source: gameDataSource,
  };
}
export function gameRecipe(id: string): Recipe | undefined {
  const r = byId.get(id);
  return r ? toRecipe(r) : undefined;
}
export function gameRecipesForOutput(output: string): Recipe[] {
  return (byOutput.get(output) ?? []).map(toRecipe);
}
export type RecipeSearch = {
  q?: string;
  kind: "crafting" | "refining";
  category?: "cooking" | "alchemy" | "equipment";
  tier?: number;
  enchantment?: number;
  limit?: number;
};
/** Name/id search; equipment excludes cooking and alchemy. Primary recipes rank before alternatives. */
export function searchGameRecipes(s: RecipeSearch) {
  const terms = (s.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const out: Recipe[] = [];
  let total = 0;
  for (const r of raw) {
    if (r.kind !== s.kind) continue;
    if (s.category === "equipment" ? r.category : s.category && r.category !== s.category) continue;
    if (s.tier && r.tier !== s.tier) continue;
    if (s.enchantment !== undefined && r.enchantment !== s.enchantment) continue;
    const haystack = `${itemName(r.output)} ${r.output}`.toLowerCase();
    if (!terms.every((t) => haystack.includes(t))) continue;
    total++;
    if (out.length < (s.limit ?? 40)) out.push(toRecipe(r));
  }
  out.sort((a, b) => (a.alternative ?? 1) - (b.alternative ?? 1));
  return { total, recipes: out };
}
