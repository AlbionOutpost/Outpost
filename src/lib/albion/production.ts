import { mechanicsProfile } from "./production-profile";
import { z } from "zod";
import { regionSchema, cities } from "./region-config";
import { recipeFor, findRecipe } from "./recipes";
import { isStale } from "./freshness";
export const observation = z.object({
  value: z.number().nonnegative().max(1e12).nullable(),
  manual: z.boolean(),
  observedAt: z.string().max(50).nullable(),
  region: regionSchema.nullable(),
  city: z.enum(cities).nullable(),
  quality: z.number().int().min(1).max(5),
});
export const productionSchema = z
  .object({
    mechanicsProfile: mechanicsProfile.nullable().default(null),
    kind: z.enum(["crafting", "refining", "enchanting"]),
    region: regionSchema,
    materialCity: z.enum(cities),
    outputCity: z.enum(cities),
    recipeId: z.string().max(60),
    batches: z.number().int().min(1).max(100000),
    quality: z.number().int().min(1).max(5),
    prices: z.record(z.string().max(100), observation),
    returns: z.record(z.string().max(100), z.boolean()),
    returnRate: z.number().min(0).max(99.9),
    focusReturnRate: z.number().min(0).max(99.9),
    useFocus: z.boolean(),
    focusUsed: z.number().int().min(0).max(1e9),
    stationFee: z.number().min(0).max(1e9),
    tax: z.number().min(0).max(100),
    setupFee: z.number().min(0).max(100),
    enchantFamily: z.string().max(60),
    tier: z.number().int().min(1).max(8),
    fromEnchant: z.number().int().min(0).max(2),
    toEnchant: z.number().int().min(1).max(3),
  })
  .superRefine((v, ctx) => {
    try {
      recipeFor(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Unsupported recipe or enchantment path" });
    }
    if (v.useFocus && v.focusUsed <= 0)
      ctx.addIssue({ code: "custom", message: "Enter the actual focus cost when using focus" });
    if (v.kind === "enchanting" && (v.useFocus || Object.values(v.returns).some(Boolean)))
      ctx.addIssue({
        code: "custom",
        message: "Enchanting does not use this production-return/focus model",
      });
  });
export type ProductionInput = z.infer<typeof productionSchema>;
export function productionOutputQuality(
  v: Pick<ProductionInput, "kind" | "quality"> & { recipeId?: string },
) {
  const consumable =
    v.kind === "crafting" &&
    v.recipeId &&
    findRecipe(v.recipeId)?.kind === v.kind &&
    findRecipe(v.recipeId)?.category;
  return v.kind === "refining" || consumable ? 1 : v.quality;
}
/** Historical focus-efficiency model; fractional estimate, not station rounding or current spec coefficients. */
export function estimatedFocusCost(base: number, efficiency: number, batches: number) {
  if (
    !Number.isFinite(base) ||
    base <= 0 ||
    base > 1e9 ||
    !Number.isFinite(efficiency) ||
    efficiency < 0 ||
    efficiency > 100000 ||
    !Number.isInteger(batches) ||
    batches < 1 ||
    batches > 100000
  )
    throw new Error("Invalid focus estimate inputs");
  return base * 2 ** (-efficiency / 10000) * batches;
}
export function returnRateFromBonus(bonus: number) {
  if (!Number.isFinite(bonus) || bonus < 0 || bonus > 1000)
    throw new Error("Invalid production bonus");
  return 1 - 1 / (1 + bonus / 100);
}
export function production(input: ProductionInput) {
  const v = productionSchema.parse(input),
    recipe = recipeFor(v);
  const rate = (v.useFocus ? v.focusReturnRate : v.returnRate) / 100;
  let grossMaterials = 0,
    returnCredit = 0,
    baseReturnCredit = 0;
  const missing: string[] = [];
  let stale = false;
  function price(id: string, quality: number, city: string) {
    const p = v.prices[id];
    if (
      (city === "Black Market" && id !== recipe.output) ||
      !p ||
      p.value === null ||
      (!p.manual && p.value === 0) ||
      p.quality !== quality ||
      (!p.manual && (p.region !== v.region || p.city !== city))
    ) {
      missing.push(id);
      return null;
    }
    if (!p.manual && (!p.observedAt || isStale(p.observedAt))) stale = true;
    return p.value;
  }
  const rows = recipe.ingredients.map((i) => {
    const unit = price(i.id, i.quality === "selected" ? v.quality : 1, v.materialCity),
      quantity = i.quantity * v.batches;
    const gross = unit === null ? null : unit * quantity;
    // Artifacts, tokens and enchanting inputs are never returned, whatever the saved flags say.
    const eligible = !!v.returns[i.id] && i.returnable !== false;
    const returned = gross !== null && eligible ? gross * rate : 0;
    if (gross !== null) {
      grossMaterials += gross;
      returnCredit += returned;
      if (eligible) baseReturnCredit += (gross * v.returnRate) / 100;
    }
    return { ...i, quantity, unit, gross, returnCredit: returned };
  });
  const outputPrice = price(recipe.output, productionOutputQuality(v), v.outputCity),
    outputQuantity = recipe.outputCount * v.batches,
    stationCost = v.stationFee * v.batches;
  if (
    grossMaterials + stationCost > 1e12 ||
    (outputPrice !== null && outputPrice * outputQuantity > 1e12)
  )
    throw new Error("Scenario totals exceed one trillion silver");
  if (missing.length || outputPrice === null)
    return {
      complete: false,
      missing: [...new Set(missing)],
      stale,
      rows,
      outputQuantity,
      grossMaterials: missing.some((id) => recipe.ingredients.some((i) => i.id === id))
        ? null
        : grossMaterials,
      stationCost,
      upfront: missing.some((id) => recipe.ingredients.some((i) => i.id === id))
        ? null
        : grossMaterials + stationCost,
      profit: null,
      cashProfit: null,
      returnCredit: null,
      fees: null,
      revenue: null,
      cost: null,
      roi: null,
      margin: null,
      profitPerFocus: null,
      incrementalPerFocus: null,
      profitPerItem: null,
    };
  const revenue = outputPrice * outputQuantity,
    fees = (revenue * (v.tax + v.setupFee)) / 100,
    cost = grossMaterials - returnCredit + stationCost,
    profit = revenue - fees - cost,
    cashProfit = revenue - fees - grossMaterials - stationCost;
  return {
    complete: true,
    missing: [],
    stale,
    rows,
    outputQuantity,
    grossMaterials,
    stationCost,
    upfront: grossMaterials + stationCost,
    profit,
    cashProfit,
    returnCredit,
    fees,
    revenue,
    cost,
    roi: cost ? (profit / cost) * 100 : null,
    margin: revenue ? (profit / revenue) * 100 : null,
    profitPerFocus: v.useFocus ? profit / v.focusUsed : null,
    incrementalPerFocus: v.useFocus ? (returnCredit - baseReturnCredit) / v.focusUsed : null,
    profitPerItem: profit / outputQuantity,
  };
}
export function initialProduction(
  kind: ProductionInput["kind"],
  region: ProductionInput["region"],
): ProductionInput {
  return {
    kind,
    region,
    mechanicsProfile: null,
    materialCity: "Lymhurst",
    outputCity: "Lymhurst",
    recipeId: kind === "refining" ? "steel-bar-t4" : "battleaxe-t4",
    batches: 1,
    quality: 1,
    prices: {},
    returns: {},
    returnRate: 0,
    focusReturnRate: 0,
    useFocus: false,
    focusUsed: 0,
    stationFee: 0,
    tax: 0,
    setupFee: 0,
    enchantFamily: "MAIN_AXE",
    tier: 4,
    fromEnchant: 0,
    toEnchant: 1,
  };
}
